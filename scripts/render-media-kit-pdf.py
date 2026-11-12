"""Render the built media-kit HTML as a four-page PDF when browser printing is unavailable."""
import os, sys, re
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Image, Table, TableStyle, Spacer

class Node:
    def __init__(self, tag="", attrs=None):
        self.tag, self.attrs, self.children = tag, dict(attrs or []), []
    def find(self, cls):
        return next((n for n in self.walk() if cls in n.attrs.get("class","").split()), None)
    def walk(self):
        yield self
        for n in self.children:
            if isinstance(n, Node):
                yield from n.walk()
    def tags(self, tag):
        return [n for n in self.walk() if n.tag == tag]
    def text(self):
        return "".join(n.text() if isinstance(n,Node) else n for n in self.children).strip()
    def rich(self):
        out = ""
        for n in self.children:
            if isinstance(n,str):
                out += escape(n)
            elif n.tag in ("strong","b"):
                out += "<b>"+n.rich()+"</b>"
            elif n.tag == "a":
                url = n.attrs.get("href","")
                if url.startswith("/"): url = "https://www.altairesports.com"+url
                out += '<link href="'+escape(url,quote=True)+'" color="#285f80">'+n.rich().replace("→","")+"</link>"
            elif n.tag == "br": out += "<br/>"
            else: out += n.rich()
        return out
class Document(HTMLParser):
    def __init__(self, html):
        super().__init__(); self.root=Node(); self.stack=[self.root]; self.feed(html)
    def handle_starttag(self, tag, attrs):
        n=Node(tag,attrs); self.stack[-1].children.append(n)
        if tag not in ("meta","link","img","br","hr","input"): self.stack.append(n)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag:
                self.stack=self.stack[:i]; break
    def handle_data(self,data): self.stack[-1].children.append(data)

source, destination = map(Path,sys.argv[1:3])
root = Document(source.read_text(encoding="utf8")).root
pages = [n for n in root.walk() if "kit-page" in n.attrs.get("class","").split()]
if len(pages)!=4: raise ValueError("Expected four media-kit source sections")
fontdir = Path(os.environ.get("WINDIR","C:/Windows"))/"Fonts"
pdfmetrics.registerFont(TTFont("Kit",str(fontdir/"segoeui.ttf")))
pdfmetrics.registerFont(TTFont("KitBold",str(fontdir/"segoeuib.ttf")))
pdfmetrics.registerFontFamily("Kit",normal="Kit",bold="KitBold",italic="Kit",boldItalic="KitBold")
W,H=595.276,841.89
M=48; WIDTH=W-2*M
NAVY=HexColor("#091a2d"); MUTED=HexColor("#43566a"); LINE=HexColor("#d6e1e8")
styles={
 "body":ParagraphStyle("body",fontName="Kit",fontSize=10.5,leading=16,textColor=MUTED,spaceAfter=10),
 "small":ParagraphStyle("small",fontName="Kit",fontSize=9,leading=13,textColor=MUTED),
 "h1":ParagraphStyle("h1",fontName="KitBold",fontSize=36,leading=39,textColor=NAVY,spaceAfter=18),
 "h2":ParagraphStyle("h2",fontName="KitBold",fontSize=27,leading=32,textColor=NAVY,spaceAfter=16),
 "h3":ParagraphStyle("h3",fontName="KitBold",fontSize=14,leading=19,textColor=NAVY,spaceAfter=7),
 "kicker":ParagraphStyle("kicker",fontName="KitBold",fontSize=8,leading=12,textColor=HexColor("#48718b"),spaceAfter=10),
}
def para(node,style="body"):
    return Paragraph(node.rich() if isinstance(node,Node) else escape(str(node)), styles[style])
def lines(nodes,style="body"): return [para(n,style) for n in nodes]
def draw_flow(flow,x,y,w):
    for f in flow:
        fw,fh=f.wrap(w,H)
        if y-fh<72: raise ValueError("Media kit content exceeds printable page")
        f.drawOn(c,x,y-fh); y-=fh+getattr(f,"spaceAfter",0)
    return y
def box(flow,w,bg="#edf6fa",pad=18):
    t=Table([[flow]],colWidths=[w])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),HexColor(bg)),("LEFTPADDING",(0,0),(-1,-1),pad),("RIGHTPADDING",(0,0),(-1,-1),pad),("TOPPADDING",(0,0),(-1,-1),pad),("BOTTOMPADDING",(0,0),(-1,-1),pad)]))
    return t
def start(page,index):
    c.setFillColor(NAVY);c.setFont("KitBold",9);c.drawString(M,H-38,"ALTAIR eSports / MEDYA KİTİ")
    c.setFillColor(MUTED);c.setFont("Kit",8);c.drawRightString(W-M,H-38,f"2026 / {index:02d}")
    c.setStrokeColor(LINE);c.line(M,H-51,W-M,H-51);c.line(M,51,W-M,51)
    c.setFont("Kit",8);c.drawString(M,36,"ALTAIR eSports")
    c.drawRightString(W-M,36,"12 Kasım 2026 · altairesports.com")
    return H-80
destination.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(destination),pagesize=(W,H))
c.setTitle("ALTAIR eSports · Medya Kiti · 12 Kasım 2026")
c.setAuthor("ALTAIR eSports")
for idx,page in enumerate(pages,1):
    y=start(page,idx)
    if idx==1:
        hero=page.find("kit-hero")
        intro=page.find("kit-intro")
        tags = "  /  ".join(n.text() for n in hero.find("kit-tags").tags("span"))
        left=[para(hero.find("kit-kicker"),"kicker"),para(hero.tags("h1")[0],"h1"),para(hero.find("kit-lead")),Spacer(1,8),para(tags,"small")]
        imgpath=source.parent/hero.tags("img")[0].attrs["src"].lstrip("/")
        img=Image(str(imgpath),width=200,height=252,kind="proportional")
        grid=Table([[left,[img]]],colWidths=[WIDTH*.57,WIDTH*.43])
        grid.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(0,-1),18)]))
        y=draw_flow([grid,Spacer(1,26)],M,y,WIDTH)
        c.setStrokeColor(LINE);c.line(M,y,W-M,y);y-=22
        flow=[para(intro.find("kit-kicker"),"kicker"),para(intro.tags("h2")[0],"h2")]
        flow+=lines([p for p in intro.tags("p") if p!=intro.find("kit-kicker")])
        flow+=lines(intro.tags("a"))
        draw_flow(flow,M,y,WIDTH)
    elif idx==2:
        y=draw_flow([para(page.find("kit-kicker"),"kicker"),para(page.tags("h2")[0],"h2"),para(page.find("kit-section-lead")),Spacer(1,16)],M,y,WIDTH)
        for article in page.find("kit-area-list").tags("article"):
            y=draw_flow([para(article.find("kit-number"),"kicker"),para(article.tags("h3")[0],"h3"),*lines(article.tags("p")),Spacer(1,15)],M,y,WIDTH)
            c.setStrokeColor(LINE);c.line(M,y+7,W-M,y+7)
        callout=page.find("kit-callout")
        draw_flow([Spacer(1,9),box([para(callout.tags("strong")[0],"h3"),*lines(callout.tags("p")),*lines(callout.tags("a"))],WIDTH)],M,y,WIDTH)
    elif idx==3:
        y=draw_flow([para(page.find("kit-kicker"),"kicker"),para(page.tags("h2")[0],"h2"),para(page.find("kit-section-lead")),Spacer(1,14)],M,y,WIDTH)
        articles=page.find("kit-channel-grid").tags("article")
        cells=[box([para(a.tags("h3")[0],"h3"),*lines(a.tags("p"))],(WIDTH-14)/2,bg="#f2f6f8",pad=15) for a in articles]
        grid=Table([[cells[0],"",cells[1]],["","",""],[cells[2],"",cells[3]]],colWidths=[(WIDTH-14)/2,14,(WIDTH-14)/2])
        grid.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
        y=draw_flow([grid,Spacer(1,24)],M,y,WIDTH)
        metrics=page.find("kit-metrics")
        flow=[para(metrics.find("kit-kicker"),"kicker"),para(metrics.tags("h3")[0],"h3")]
        empty=metrics.find("document-empty-metrics")
        if empty:
            flow+=lines(empty.tags("strong"))+lines(empty.tags("p"))
        else:
            for metric in metrics.tags("article"): flow.append(para(metric.text()))
        flow+=lines([n for n in metrics.children if isinstance(n,Node) and n.tag=="p" and n!=metrics.find("kit-kicker")])
        draw_flow([box(flow,WIDTH)],M,y,WIDTH)
    else:
        y=draw_flow([para(page.find("kit-kicker"),"kicker"),para(page.tags("h2")[0],"h2"),para(page.find("kit-section-lead")),Spacer(1,12)],M,y,WIDTH)
        figures=[]
        for figure in page.tags("figure"):
            img=Image(str(source.parent/figure.tags("img")[0].attrs["src"].lstrip("/")),width=105,height=105,kind="proportional")
            dark = "kit-logo-dark" in figure.attrs.get("class", "").split()
            caption_style = ParagraphStyle("caption", parent=styles["small"], textColor=HexColor("#e5f0fa") if dark else MUTED)
            caption = Paragraph(figure.tags("figcaption")[0].rich(), caption_style)
            figures.append(box([img,Spacer(1,12),caption],(WIDTH-16)/2,bg="#091a2d" if dark else "#edf3f6",pad=18))
        grid=Table([[figures[0],"",figures[1]]],colWidths=[(WIDTH-16)/2,16,(WIDTH-16)/2])
        grid.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0)]))
        y=draw_flow([grid,Spacer(1,16),para(page.find("kit-guidance")),Spacer(1,26)],M,y,WIDTH)
        contact=page.find("kit-contact")
        flow=[para(contact.find("kit-kicker"),"kicker"),para(contact.tags("h2")[0],"h2")]
        flow+=lines([n for n in contact.tags("p") if n!=contact.find("kit-kicker")])+lines(contact.tags("a"))
        draw_flow([box(flow,WIDTH)],M,y,WIDTH)
    c.showPage()
c.save()
print(f"Rendered {len(pages)} media-kit pages from {source.name}")
