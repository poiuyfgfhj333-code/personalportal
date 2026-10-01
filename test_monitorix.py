import urllib.request
import re

html_url = 'http://210.125.111.159:9090/monitorix-cgi/monitorix.cgi?mode=localhost&graph=all&when=1day&color=black'
try:
    html = urllib.request.urlopen(html_url, timeout=5).read().decode('utf-8', errors='ignore')
    pattern = re.compile(r'<b>&nbsp;&nbsp;([^<]+)</b>.*?</td>\s*</tr>\s*<tr>(.*?)<!-- graph table ends -->', re.DOTALL)
    for m in pattern.finditer(html):
        title = m.group(1).strip()
        content = m.group(2)
        imgs = re.findall(r'src=[\'"]([^\'"]+)[\'"]', content)
        if any(k in title for k in ['LM-Sensors', 'NVIDIA', 'Disk']):
            print(f"=== {title} ===")
            for img in imgs:
                print("  ", img)
except Exception as e:
    print("Error:", e)
