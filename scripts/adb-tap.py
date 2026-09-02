import re,subprocess,sys
ADB=subprocess.check_output(['bash','-lc','command -v adb']).decode().strip()
def dump():
    subprocess.run([ADB,'shell','uiautomator','dump','/sdcard/d.xml'],capture_output=True)
    return subprocess.check_output([ADB,'shell','cat','/sdcard/d.xml']).decode('utf-8','ignore')
def find(key):
    x=dump()
    for m in re.finditer(r'<node[^>]*>',x):
        s=m.group(0)
        rid=re.search(r'resource-id="([^"]*)"',s).group(1)
        cd=re.search(r'content-desc="([^"]*)"',s).group(1)
        t=re.search(r'text="([^"]*)"',s).group(1)
        if key in (rid,cd,t):
            b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',s)
            x1,y1,x2,y2=map(int,b.groups())
            return (x1+x2)//2,(y1+y2)//2
    return None
if __name__=='__main__':
    p=find(sys.argv[1])
    if not p: sys.exit('not found: '+sys.argv[1])
    print(p[0],p[1])
