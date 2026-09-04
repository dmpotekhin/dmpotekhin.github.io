#!/usr/bin/env python3
"""
Process travel media (photos + videos) into the site and emit js/travel-media.js.

Pipeline per city:
    photo file -> resize/compress -> photos/<slug>.jpg   (Pillow)
    video file -> transcode H.264 720p -> videos/<slug>.mp4  (ffmpeg)
    poster     -> extracted first frame (or the photo) -> photos/<slug>.jpg
    mapping    -> js/travel-media.js  { "<city>": { photo, video, poster } }

Usage:
    python3 scripts/process_travel_media.py --mapping media.csv --src-dir ./media
    python3 scripts/process_travel_media.py --mapping media.csv --src-dir ./media --write
    python3 scripts/process_travel_media.py --emit-only --mapping media.csv   # prints mapping, no processing

mapping.csv columns (header optional, order: city,photo,video):
    Барселона, barcelona.jpg, barcelona.mp4
    Бангкок,  bangkok.jpg,   bangkok.mp4
Sources (photo/video) are resolved relative to --src-dir.
"""
import argparse, csv, json, os, re, subprocess, sys
from pathlib import Path

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# Simple RU->latin transliteration for slugs.
TRANSLIT = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i',
    'й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t',
    'у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'',
    'э':'e','ю':'yu','я':'ya',
    # common latin stays as-is
}

def slug(name):
    s = name.strip().lower()
    out = ''.join(TRANSLIT.get(ch, ch if re.match(r'[a-z0-9]', ch) else '') for ch in s)
    out = re.sub(r'[^a-z0-9]+', '-', out).strip('-')
    return out or 'city'

def process_photo(src, dst, max_w=1000, quality=80):
    if not HAS_PIL:
        print('  [warn] Pillow not installed; copying photo unchanged ->', dst)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        import shutil; shutil.copyfile(src, dst); return
    im = Image.open(src).convert('RGB')
    if im.width > max_w:
        im = im.resize((max_w, int(im.height * max_w / im.width)), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, 'JPEG', quality=quality, optimize=True)
    print('  photo ->', dst, '(' + str(im.size[0]) + 'x' + str(im.size[1]) + ')')

def process_photo_thumb(src, dst, max_w=160, quality=70):
    """Small JPEG thumbnail (sidebar list) resized from the same source image."""
    if not HAS_PIL:
        import shutil; shutil.copyfile(src, dst); return
    im = Image.open(src).convert('RGB')
    if im.width > max_w:
        im = im.resize((max_w, int(im.height * max_w / im.width)), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, 'JPEG', quality=quality, optimize=True)
    print('  thumb ->', dst, '(' + str(im.size[0]) + 'x' + str(im.size[1]) + ')')


def process_video(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    cmd = ['ffmpeg', '-y', '-i', src, '-c:v', 'libx264', '-crf', '23',
           '-preset', 'slow', '-vf', 'scale=-2:720', '-c:a', 'aac',
           '-movflags', '+faststart', dst]
    subprocess.run(cmd, check=True, capture_output=True)
    print('  video ->', dst)

def extract_poster(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    cmd = ['ffmpeg', '-y', '-i', src, '-vframes', '1', dst]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        print('  poster ->', dst)
    except Exception as e:
        print('  [warn] poster extraction failed:', e)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mapping', required=True, help='CSV: city,photo,video')
    ap.add_argument('--src-dir', default='.', help='dir with source media files')
    ap.add_argument('--photos-dir', default='photos')
    ap.add_argument('--videos-dir', default='videos')
    ap.add_argument('--write', action='store_true', help='write js/travel-media.js')
    ap.add_argument('--media-js', default='js/travel-media.js')
    ap.add_argument('--emit-only', action='store_true', help='print mapping only')
    args = ap.parse_args()

    entries = {}
    with open(args.mapping, encoding='utf-8') as f:
        for row in csv.reader(f):
            if not row or not row[0].strip():
                continue
            if row[0].strip().lower() == 'city':  # skip header
                continue
            city = row[0].strip()
            photo_src = row[1].strip() if len(row) > 1 and row[1].strip() else None
            video_src = row[2].strip() if len(row) > 2 and row[2].strip() else None
            s = slug(city)
            p = args.photos_dir + '/' + s + '.jpg'
            p_thumb = args.photos_dir + '/' + s + '_thumb.jpg'
            v = args.videos_dir + '/' + s + '.mp4'
            med = {}
            if photo_src and not args.emit_only:
                process_photo(os.path.join(args.src_dir, photo_src), p)
                process_photo_thumb(os.path.join(args.src_dir, photo_src), p_thumb)
                med['photo'] = p
                med['thumb'] = p_thumb
            elif video_src and not args.emit_only:
                extract_poster(os.path.join(args.src_dir, video_src), p)
                process_photo_thumb(p, p_thumb)
                med['poster'] = p
                med['thumb'] = p_thumb
            if video_src and not args.emit_only:
                process_video(os.path.join(args.src_dir, video_src), v)
                med['video'] = v
                med['poster'] = med.get('poster') or (med.get('photo') or p)
            # in --emit-only we just record the intended paths for preview
            if args.emit_only:
                med = {'photo': p, 'thumb': p_thumb} if photo_src else {}
                if video_src:
                    med['video'] = v
                    med['poster'] = med.get('photo') or p
            entries[city] = med

    header = ('// Auto-generated by scripts/process_travel_media.py.\n'
              '// City name -> { photo, thumb, video, poster }. thumb is the small\n'
              '// sidebar-list image; photo is the full-size popup image. Edit\n'
              '// города.xlsx/media then re-run this script.\nwindow.TRAVEL_MEDIA = ')
    body = json.dumps(entries, ensure_ascii=False, indent=2)
    output = header + body + ';\n'
    if args.write and not args.emit_only:
        with open(args.media_js, 'w', encoding='utf-8') as f:
            f.write(output)
        print('# WROTE', args.media_js, '->', len(entries), 'cities with media')
    else:
        print(output)
    print('# total cities with media:', len(entries))

if __name__ == '__main__':
    main()
