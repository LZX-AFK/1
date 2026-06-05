from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(r"D:\classnote-ai-hx\outputs\manual-20260605-ppt-feedback\presentations\review-fix")
OUT = ROOT / "preview" / "visual-v2"
ASSETS = ROOT / "assets" / "source-slide7"
LOGO = ROOT / "pptx-unpack-template" / "ppt" / "media" / "image2.png"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1600, 900
BLUE = (0, 64, 112)
DEEP = (0, 43, 85)
GREEN = (0, 176, 80)
LIGHT = (246, 250, 252)
LINE = (190, 210, 224)
TEXT = (28, 38, 52)
MUTED = (88, 96, 105)
PALE_GREEN = (232, 247, 239)


def font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def wrap(draw, text, max_width, f):
    lines, line = [], ""
    for ch in text:
        trial = line + ch
        if draw.textlength(trial, font=f) <= max_width or not line:
            line = trial
        else:
            lines.append(line)
            line = ch
    if line:
        lines.append(line)
    return lines


def draw_text(draw, text, box, size=24, fill=TEXT, bold=False, align="left", spacing=1.22):
    x, y, w, h = box
    f = font(size, bold)
    lines = wrap(draw, text, w, f)
    line_h = int(size * spacing)
    total_h = min(len(lines) * line_h, h)
    yy = y + (h - total_h) / 2 if align == "center-v" else y
    for line in lines:
        if yy + line_h > y + h + 2:
            break
        xx = x
        if align in ("center", "center-v"):
            xx = x + (w - draw.textlength(line, font=f)) / 2
        draw.text((xx, yy), line, font=f, fill=fill)
        yy += line_h


def rounded(draw, xy, radius=28, fill="white", outline=LINE, width=2):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def shadow_card(img, xy, radius=30, fill="white", outline=LINE):
    x1, y1, x2, y2 = xy
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x1 + 4, y1 + 6, x2 + 4, y2 + 6), radius=radius, fill=(0, 43, 85, 26))
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    img.alpha_composite(shadow)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=2)


def base(title, subtitle, page):
    img = Image.new("RGBA", (W, H), "white")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 47, 40, 102], fill=BLUE)
    d.rectangle([52, 47, 70, 102], fill=BLUE)
    d.text((88, 58), title, font=font(33, True), fill=TEXT)
    d.text((102, 102), subtitle, font=font(16), fill=MUTED)
    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA")
        logo.thumbnail((175, 58))
        img.alpha_composite(logo, (1320, 32))
    d.text((56, 862), "版权所有 © 2025 Capchem. All Rights Reserved.", font=font(17), fill=TEXT)
    d.line([410, 869, 1460, 869], fill=(126, 126, 126), width=2)
    d.text((1462, 845), str(page), font=font(16), fill=MUTED)
    return img, d


def pill(draw, xy, text, fill=GREEN):
    draw.rounded_rectangle(xy, radius=12, fill=fill)
    x1, y1, x2, y2 = xy
    f = font(18, True)
    draw.text((x1 + (x2 - x1 - draw.textlength(text, font=f)) / 2, y1 + 9), text, font=f, fill="white")


def paste_fit(img, path, box):
    if not path.exists():
        return
    x, y, w, h = box
    p = Image.open(path).convert("RGBA")
    p.thumbnail((w, h))
    img.alpha_composite(p, (x + (w - p.width) // 2, y + (h - p.height) // 2))


def slide1():
    img, d = base(
        "客户反馈补充证据与整改闭环",
        "用三项客户反馈补证据链，重点说明：风险已提示，但未前置进入执行闭环。",
        7,
    )
    d.line([190, 220, 1408, 220], fill=BLUE, width=4)
    items = [
        ("4月22日", "报价阶段", "风险条款已提示", "报价单已注明包装桶保管及丢失赔付要求。", "shape-8.png"),
        ("5月18日", "首次沟通", "回收安排节点偏晚", "客户反馈“送货时带回”，但已错过发货前锁定窗口。", "shape-14.png"),
        ("5月21日", "最终确认", "空桶已处理，无法追回", "客户确认仓库已处理，形成44个空桶报废及8万元损失。", "shape-18.png"),
    ]
    xs = [120, 555, 990]
    for x, (date, phase, headline, desc, pic) in zip(xs, items):
        d.ellipse([x + 182, 198, x + 224, 240], fill=GREEN)
        d.text((x + 164, 126), date, font=font(36, True), fill=TEXT)
        d.text((x + 181, 166), phase, font=font(19), fill=MUTED)
        shadow_card(img, (x, 260, x + 370, 600), radius=28, fill="white", outline=LINE)
        pill(d, (x + 28, 283, x + 138, 327), "节点")
        d.text((x + 28, 353), headline, font=font(24, True), fill=TEXT)
        draw_text(d, desc, (x + 28, 397, 312, 72), 19, MUTED)
        d.rounded_rectangle([x + 44, 496, x + 326, 582], radius=18, fill=(248, 248, 248), outline=(226, 226, 226), width=2)
        paste_fit(img, ASSETS / pic, (x + 58, 504, 254, 70))
    d.rounded_rectangle([112, 658, 1488, 764], radius=26, fill=(244, 248, 251), outline=LINE, width=2)
    pill(d, (150, 690, 266, 734), "复盘结论", fill=BLUE)
    draw_text(
        d,
        "本次问题不是“没有沟通”，而是报价风险条款未进入执行闭环，且沟通节点明显滞后。整改重点前移至：发货前确权、测试中跟踪、测试后限时回收。",
        (292, 676, 1120, 78),
        23,
        TEXT,
    )
    img.convert("RGB").save(OUT / "visual-v2-slide-01.png")


def slide2():
    img, d = base(
        "复盘总结：个人识别不足与机制补强",
        "弱化个人批判，保留问题意识，把整改落点放在风险识别、经验复盘与部门协同。",
        8,
    )
    shadow_card(img, (115, 178, 735, 660), radius=34, fill="white", outline=LINE)
    shadow_card(img, (785, 178, 1485, 660), radius=34, fill="white", outline=LINE)
    pill(d, (158, 216, 284, 262), "调整后表述")
    draw_text(
        d,
        "本次项目造成44个空桶报废及8万元直接损失，暴露出本人对测试空桶回收风险识别不充分，对客户回收节点和内部协同机制预判不足，导致跟进节奏滞后。",
        (158, 302, 505, 126),
        27,
        TEXT,
    )
    d.line([158, 458, 662, 458], fill=LINE, width=2)
    draw_text(
        d,
        "因以往测试流程中较少涉及空桶回收要求，本人沿用既有测试跟进经验，对本次空桶回收的特殊性和关键风险节点识别不足。",
        (158, 490, 505, 104),
        25,
        TEXT,
    )
    pill(d, (828, 216, 952, 262), "机制补强")
    mechanisms = [
        ("前置识别", "发货前确认空桶归属、暂存、回收时限及赔付条款。"),
        ("过程跟踪", "测试期间建立节点台账，避免仅依赖单点转述。"),
        ("协同留痕", "销售、商务、厂务/仓库同步信息，关键事项书面留痕。"),
        ("部门复核", "重大风险节点提交部门审核，给公司保留审核空间。"),
    ]
    y = 298
    for title, body in mechanisms:
        d.ellipse([828, y + 7, 850, y + 29], fill=GREEN)
        d.text((868, y), title, font=font(23, True), fill=TEXT)
        draw_text(d, body, (1010, y, 410, 44), 20, MUTED)
        y += 82
    d.rounded_rectangle([220, 710, 1380, 770], radius=18, fill=PALE_GREEN, outline=None)
    draw_text(
        d,
        "表述基调：承认识别不足与跟进滞后，但将整改落点放在流程闭环、部门协同与节点审核。",
        (258, 724, 1084, 32),
        23,
        TEXT,
        True,
        "center",
    )
    img.convert("RGB").save(OUT / "visual-v2-slide-02.png")


def slide3():
    img, d = base(
        "后续工作计划：商务协同与损失挽回",
        "把损失挽回计划纳入正式工作机制，避免作为底部硬塞式新增。",
        9,
    )
    d.line([190, 535, 1410, 535], fill=BLUE, width=4)
    steps = [
        ("01", "发货前确权", "销售牵头，商务协同客户确认空桶回收、赔付条款、回收窗口和对接人。", "发货前"),
        ("02", "5个工作日反馈", "关键事项发出后5个工作日内取得客户回复；未回复即升级联动跟进。", "测试中"),
        ("03", "台账与预警", "建立测试物料与空桶回收台账，测试完成后3个工作日内核对空桶状态。", "测试后"),
        ("04", "损失挽回计划", "结合三季度大批量测试，通过价格策略和商务条款，争取抵回8万元损失。", "商务回收"),
    ]
    xs = [82, 464, 846, 1228]
    for x, (num, title, body, phase) in zip(xs, steps):
        shadow_card(img, (x, 205, x + 292, 470), radius=30, fill="white", outline=LINE)
        d.ellipse([x + 28, 236, x + 82, 290], fill=GREEN)
        d.text((x + 43, 250), num, font=font(25, True), fill="white")
        d.text((x + 30, 322), title, font=font(25, True), fill=TEXT)
        draw_text(d, body, (x + 30, 366, 232, 82), 19, MUTED)
        d.ellipse([x + 132, 516, x + 170, 554], fill=BLUE)
        d.text((x + 114, 578), phase, font=font(19), fill=MUTED)
    d.rounded_rectangle([260, 680, 1340, 760], radius=24, fill=(244, 248, 251), outline=LINE, width=2)
    d.text((330, 708), "原则：风险条款前置、客户反馈限时、逾期协同升级、损失挽回纳入后续商务方案。", font=font(27, True), fill=TEXT)
    img.convert("RGB").save(OUT / "visual-v2-slide-03.png")


slide1()
slide2()
slide3()
print(OUT)
