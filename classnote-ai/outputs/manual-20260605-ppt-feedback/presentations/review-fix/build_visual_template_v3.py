from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"D:\classnote-ai-hx\outputs\manual-20260605-ppt-feedback\presentations\review-fix")
OUT = ROOT / "preview" / "template-v3"
MEDIA = ROOT / "pptx-unpack-source" / "ppt" / "media"
ASSETS = ROOT / "assets" / "source-slide7"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1600, 900
BLUE = (0, 65, 113)
BLUE2 = (8, 83, 142)
GREEN = (101, 190, 49)
TEXT = (31, 41, 55)
MUTED = (93, 101, 112)
BORDER = (189, 211, 228)
LIGHT = (244, 249, 252)
HEADER = (0, 68, 125)


def font(size, bold=False):
    paths = [
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
    ]
    for p in paths:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def wrap(draw, text, max_width, f):
    lines = []
    for para in str(text).split("\n"):
        cur = ""
        for ch in para:
            trial = cur + ch
            if draw.textlength(trial, font=f) <= max_width or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = ch
        if cur:
            lines.append(cur)
    return lines


def text(draw, s, box, size=20, fill=TEXT, bold=False, align="left", valign="top", spacing=1.22):
    x, y, w, h = box
    f = font(size, bold)
    lines = wrap(draw, s, w, f)
    lh = int(size * spacing)
    total = len(lines) * lh
    yy = y if valign == "top" else y + max(0, (h - total) / 2)
    for line in lines:
        if yy + lh > y + h + 4:
            break
        xx = x
        if align == "center":
            xx = x + (w - draw.textlength(line, font=f)) / 2
        draw.text((xx, yy), line, font=f, fill=fill)
        yy += lh


def base(title, page, subtitle=None):
    img = Image.new("RGBA", (W, H), "white")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 48, 40, 103], fill=BLUE)
    d.rectangle([52, 48, 70, 103], fill=BLUE)
    d.text((88, 62), title, font=font(27, True), fill=TEXT)
    if subtitle:
        d.text((92, 100), subtitle, font=font(14), fill=MUTED)
    logo = MEDIA / "image14.png"
    if logo.exists():
        im = Image.open(logo).convert("RGBA")
        im.thumbnail((150, 50))
        img.alpha_composite(im, (1330, 38))
    d.text((56, 862), "版权所有 © 2025 Capchem. All Rights Reserved.", font=font(15), fill=TEXT)
    d.line([410, 869, 1460, 869], fill=(125, 125, 125), width=2)
    d.text((1468, 846), str(page), font=font(15), fill=MUTED)
    return img, d


def rr(draw, xy, fill="white", outline=BORDER, width=2, radius=22):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def paste_fit(img, path, box):
    if not path.exists():
        return
    x, y, w, h = box
    im = Image.open(path).convert("RGBA")
    im.thumbnail((w, h))
    img.alpha_composite(im, (x + (w - im.width) // 2, y + (h - im.height) // 2))


def label(draw, xy, s, fill=GREEN):
    draw.rounded_rectangle(xy, radius=8, fill=fill)
    x1, y1, x2, y2 = xy
    f = font(17, True)
    draw.text((x1 + (x2 - x1 - draw.textlength(s, font=f)) / 2, y1 + 8), s, font=f, fill="white")


def slide_problem_table():
    img, d = base("四、问题与整改措施", 6, "在原表格框架上调整口径：弱化个人批判，强化流程闭环与商务协同。")
    x0, y0, w = 90, 150, 1180
    row_h = 108
    col = [90, 350, 680, 1270]
    d.rectangle([x0, y0, x0 + w, y0 + 54], fill=HEADER)
    for x in col[1:-1]:
        d.line([x, y0, x, y0 + 54 + row_h * 4], fill=(210, 224, 234), width=2)
    for i, h in enumerate(["问题点", "调整后原因", "整改动作"]):
        text(d, h, (col[i] + 14, y0 + 14, col[i + 1] - col[i] - 28, 30), 17, "white", True, "center")
    rows = [
        ("小量测试闭环不足", "测试结束后，对空桶回收风险节点识别不充分，未及时形成回收确认。", "测试完成后3个工作日内核对空桶状态，建立个人跟进台账。"),
        ("中量测试跟进滞后", "沿用以往测试经验，对本次空桶回收特殊性预判不足，沟通节点偏晚。", "发货前完成客户采购、厂务、仓库三方邮件确权，锁定回收窗口。"),
        ("商务信息同步不足", "商务条款与回收要求未形成统一书面同步，存在跨部门信息断点。", "销售与商务共同确认关键事项，客户反馈5个工作日内闭环，逾期升级。"),
        ("异常响应不够及时", "发现空桶进入处置流程后，缺少快速联动机制和责任边界。", "建立异常升级机制，联动商务、客户仓库及相关部门及时处置。"),
    ]
    for r, row in enumerate(rows):
        y = y0 + 54 + r * row_h
        fill = (249, 252, 254) if r % 2 else "white"
        d.rectangle([x0, y, x0 + w, y + row_h], fill=fill, outline=(210, 224, 234), width=1)
        for x in col[1:-1]:
            d.line([x, y, x, y + row_h], fill=(210, 224, 234), width=2)
        d.ellipse([108, y + 34, 144, y + 70], fill=GREEN)
        d.text((119, y + 41), str(r + 1), font=font(18, True), fill="white")
        text(d, row[0], (158, y + 32, 180, 46), 18, TEXT, True, "center", "middle")
        text(d, row[1], (370, y + 20, 290, 76), 16, TEXT)
        text(d, row[2], (700, y + 20, 535, 76), 16, TEXT)
    # Right fact card
    rr(d, (1300, 150, 1495, 586), fill=LIGHT, outline=BORDER, radius=18)
    paste_fit(img, MEDIA / "image7.png", (1348, 182, 88, 100))
    text(d, "事实总结", (1328, 302, 140, 32), 21, BLUE, True, "center")
    text(d, "44个空桶报废\n8万元直接损失\n整改重点转向流程闭环与部门协同", (1324, 350, 150, 116), 18, TEXT, False, "center")
    rr(d, (90, 650, 1495, 742), fill=(244, 249, 252), outline=BORDER, radius=18)
    label(d, (120, 678, 240, 720), "核心调整", fill=BLUE)
    text(d, "不再强化“个人严重失职”表述，改为“风险识别不足、节点预判不足、协同机制不足”，并以流程机制补强作为整改主线。", (270, 670, 1160, 48), 22, TEXT)
    img.convert("RGB").save(OUT / "template-v3-slide-06.png")


def slide_evidence():
    img, d = base("客户反馈补充证据与整改闭环", 7, "保留原三项证据，但按模板正文页重排为“证据-判断-整改结论”。")
    # Main left evidence
    rr(d, (78, 152, 610, 620), fill="white", outline=BORDER, radius=20)
    label(d, (108, 178, 230, 220), "证据 01", fill=GREEN)
    d.text((108, 250), "4月22日：报价阶段已明确风险条款", font=font(24, True), fill=TEXT)
    text(d, "报价单备注已提示包装桶妥善保管及丢失赔偿要求，说明风险条款存在，但未进入后续发货、测试、回收执行闭环。", (108, 296, 440, 78), 19, MUTED)
    d.rounded_rectangle([132, 405, 558, 555], radius=18, fill=(248, 248, 248), outline=(226, 226, 226), width=2)
    paste_fit(img, ASSETS / "shape-8.png", (160, 420, 370, 120))
    # Right evidence stacked
    cards = [
        (660, 152, "证据 02", "5月18日：首次沟通空桶回收安排", "客户反馈“送货时带回”，说明沟通确实发生，但节点已偏晚，未形成发货前锁定与回收确认。", "shape-14.png"),
        (660, 388, "证据 03", "5月21日：确认已处理且无法追回", "客户反馈仓库已处理、空桶追不回，最终形成44个空桶报废及8万元直接损失。", "shape-18.png"),
    ]
    for x, y, tag, title, body, pic in cards:
        rr(d, (x, y, 1490, y + 200), fill="white", outline=BORDER, radius=20)
        label(d, (x + 28, y + 26, x + 148, y + 68), tag, fill=GREEN)
        d.text((x + 180, y + 32), title, font=font(24, True), fill=TEXT)
        text(d, body, (x + 180, y + 78, 460, 62), 18, MUTED)
        d.rounded_rectangle([x + 650, y + 54, x + 792, y + 142], radius=14, fill=(248, 248, 248), outline=(226, 226, 226), width=2)
        paste_fit(img, ASSETS / pic, (x + 660, y + 62, 122, 72))
    rr(d, (78, 660, 1490, 762), fill=(244, 249, 252), outline=BORDER, radius=18)
    label(d, (110, 690, 238, 732), "复盘结论", fill=BLUE)
    text(d, "本次问题不是“没有沟通”，而是风险条款未进入执行闭环，且沟通节点明显滞后。整改重点由“事后询问”前移为“发货前确权、测试中跟踪、测试后限时回收”。", (268, 682, 1180, 56), 21, TEXT)
    img.convert("RGB").save(OUT / "template-v3-slide-07.png")


def slide_summary():
    img, d = base("五、复盘总结", 8, "保留原“后续计划 + 复盘反思”框架，融入商务协同与损失挽回计划。")
    # Left visual strip
    d.rectangle([78, 150, 345, 620], fill=BLUE)
    paste_fit(img, MEDIA / "image20.png", (88, 162, 247, 144))
    paste_fit(img, MEDIA / "image21.png", (88, 320, 247, 168))
    d.rectangle([88, 504, 335, 608], fill=(255, 255, 255))
    text(d, "复盘反思 · 明确问题\n总结改进 · 持续优化", (104, 528, 210, 56), 19, BLUE, True, "center")
    # Right stacked blocks
    blocks = [
        ("后续工作计划", "1. 三季度大批量测试前，完成客户采购、厂务、仓库三方对接及邮件确权。\n2. 发货前锁定空桶暂存、回收窗口、赔付条款和客户对接人。\n3. 测试期间建立节点台账，测试后3个工作日内核对空桶状态。\n4. 关键事项发出后5个工作日内需取得客户回复，逾期联动商务升级。"),
        ("复盘反思", "本次问题暴露出本人对测试空桶回收风险识别不充分，对客户回收节点和内部协同机制预判不足，导致跟进节奏滞后。因以往测试较少涉及空桶回收要求，本人沿用既有测试经验，对本次特殊风险节点识别不足。"),
        ("商务协同与损失挽回", "后续由销售牵头、商务协同，将回收要求和客户反馈时限纳入工作机制。结合三季度大批量测试推进，通过价格策略优化、商务条款调整等方式，争取逐步抵回本次8万元空桶损失。"),
    ]
    y = 150
    for i, (title, body) in enumerate(blocks):
        h = 154 if i == 0 else 142
        rr(d, (380, y, 1490, y + h), fill="white", outline=BORDER, radius=18)
        # icon block
        d.rounded_rectangle([405, y + 34, 468, y + 98], radius=14, fill=(241, 248, 253), outline=BORDER, width=1)
        icon = ["image10.png", "image12.png", "image9.png"][i]
        paste_fit(img, MEDIA / icon, (418, y + 44, 38, 42))
        d.text((500, y + 24), title, font=font(23, True), fill=BLUE)
        text(d, body, (500, y + 62, 960, h - 74), 16 if i == 0 else 17, TEXT)
        y += h + 26
    rr(d, (380, 646, 1490, 748), fill=(255, 249, 236), outline=(228, 188, 108), radius=14)
    label(d, (410, 676, 540, 718), "表述口径", fill=BLUE)
    text(d, "承认识别不足与跟进滞后，但避免过度个人化；整改落点放在流程闭环、部门协同、节点审核和商务挽回。", (570, 670, 870, 48), 21, TEXT)
    img.convert("RGB").save(OUT / "template-v3-slide-08.png")


slide_problem_table()
slide_evidence()
slide_summary()
print(OUT)
