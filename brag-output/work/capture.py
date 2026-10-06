import sys, os, asyncio, json, pathlib, subprocess
from playwright.async_api import async_playwright
import imageio_ffmpeg
HERE = pathlib.Path(__file__).parent.resolve()
URL = (HERE / 'video.html').as_uri()

async def setup(pw):
    b = await pw.chromium.launch(channel='chrome', args=['--force-device-scale-factor=1','--hide-scrollbars'])
    pg = await b.new_page(viewport={'width':1920,'height':1080})
    await pg.goto(URL, wait_until='networkidle')
    await pg.evaluate("document.fonts.ready")
    await pg.wait_for_function("getComputedStyle(document.querySelector('.bg-green-600')).backgroundColor !== 'rgba(0, 0, 0, 0)'")
    await pg.evaluate("Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => i.onload = r)))")
    await pg.wait_for_timeout(500)
    return b, pg

async def stills(times):
    async with async_playwright() as pw:
        b, pg = await setup(pw)
        os.makedirs(HERE/'stills', exist_ok=True)
        for t in times:
            await pg.evaluate(f"render({t})")
            await pg.screenshot(path=str(HERE/'stills'/f't{t:06.2f}.png'))
        cues = await pg.evaluate("CUE_TIMES()")
        json.dump(cues, open(HERE/'cues.json','w'), indent=1)
        await b.close()

async def video(fps=30):
    async with async_playwright() as pw:
        b, pg = await setup(pw)
        dur = await pg.evaluate("DURATION")
        n = int(round(dur*fps))
        ff = imageio_ffmpeg.get_ffmpeg_exe()
        proc = subprocess.Popen([ff,'-y','-f','image2pipe','-framerate',str(fps),'-i','-','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p',str(HERE/'video_noaudio.mp4')], stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
        for i in range(n):
            await pg.evaluate(f"render({i/fps})")
            png = await pg.screenshot(type='png')
            proc.stdin.write(png)
            if i % 60 == 0: print('frame', i, '/', n, flush=True)
        proc.stdin.close(); proc.wait()
        await b.close()

if __name__ == '__main__':
    if sys.argv[1] == 'stills':
        asyncio.run(stills([float(x) for x in sys.argv[2:]]))
    else:
        asyncio.run(video())
