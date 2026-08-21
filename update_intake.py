import re

with open('src/pages/Intake.tsx', 'r') as f:
    content = f.read()

# Add useI18n to components
components = [
    'Intake', 'ConsentStep', 'ReporterStep', 'VictimStep', 'VoiceStep',
    'QuestionBubble', 'AssessStep', 'AIStep', 'ReferralStep',
    'SignatureStep', 'ConfirmedStep', 'DobPicker', 'PhotoUpload'
]

for comp in components:
    # Use a safer regex to insert after hook calls if present, or at the start of body
    pattern = rf'(function {comp}\s*\([^)]*\)\s*\{{)'
    replacement = r'\1\n  const { t } = useI18n();'
    content = re.sub(pattern, replacement, content)

# Mappings (regex-based for common patterns)
# Step labels, buttons, toasts
subs = [
    (r"toast\.success\('ทำต่อจากฉบับร่างเดิม'\)", "toast.success(t('intake.toast.resumedDraft'))"),
    (r"toast\.success\('เริ่มบันทึกใหม่'\)", "toast.success(t('intake.toast.startedNew'))"),
    (r"พบฉบับร่างที่ยังบันทึกไม่เสร็จ", "{t('intake.draft.found')}"),
    (r"บันทึกไว้เมื่อ \{new Date\(draftAt\)\.toLocaleString\('th-TH'\)\} — ทำต่อได้โดยไม่ต้องเล่าเรื่องซ้ำ", 
     "{t('intake.draft.savedAt', { date: new Date(draftAt).toLocaleString('th-TH') })}"),
    (r"RotateCcw className=\"w-3\.5 h-3\.5\" /> ทำต่อจากเดิม", "RotateCcw className=\"w-3.5 h-3.5\" /> {t('intake.draft.resume')}"),
    (r"Trash2 className=\"w-3\.5 h-3\.5\" /> เริ่มใหม่", "Trash2 className=\"w-3.5 h-3.5\" /> {t('intake.draft.startNew')}"),
    (r"มีเคสค้างในเครื่องนี้ \{pending\} รายการ", "{t('intake.pending.count', { n: pending })}"),
    (r"แตะเพื่อเปิดหน้ากู้เคสและส่งเข้าระบบ", "{t('intake.pending.tap')}"),
    
    # Consent
    (r"ก่อนเริ่มการสัมภาษณ์", "{t('intake.consent.title')}"),
    (r"Before We Begin", "{t('intake.consent.subtitle')}"),
    (r"label=\"ฟังข้อตกลง\"", "label={t('intake.consent.listen')}"),
    (r"'การสนทนานี้เป็นไปโดยสมัครใจ คุณสามารถหยุดได้ทุกเมื่อ'", "t('intake.consent.item1')"),
    (r"'เสียงของคุณจะถูกแปลงเป็นข้อความโดย AI เพื่อการประเมินเท่านั้น'", "t('intake.consent.item2')"),
    (r"'ข้อมูลเก็บเป็นความลับ ไม่เปิดเผยต่อบุคคลภายนอกโดยไม่ได้รับอนุญาต'", "t('intake.consent.item3')"),
    (r"'คุณมีสิทธิขอตรวจสอบและแก้ไขข้อมูลของตัวเองได้ทุกเวลา'", "t('intake.consent.item4')"),
    (r"หากอยู่ในอันตราย โทร <strong>1300</strong> \(กรมกิจการสตรี\) หรือ <strong>1669</strong> \(ฉุกเฉิน\)", 
     "{t('intake.consent.sos').split('1300')[0]}<strong>1300</strong>{t('intake.consent.sos').split('1300')[1].split('1669')[0]}<strong>1669</strong>{t('intake.consent.sos').split('1669')[1]}"),
    (r"label: 'ฉันเข้าใจและยินยอมให้บันทึกและวิเคราะห์เสียงในการสัมภาษณ์ครั้งนี้'", "label: t('intake.consent.cb1')"),
    (r"label: 'ฉันรับทราบว่าสามารถหยุดหรือถอนความยินยอมได้ทุกเมื่อ'", "label: t('intake.consent.cb2')"),
    (r"label: 'ยินยอมให้ส่ง “เฉพาะไฟล์เสียง” \(ไม่แนบชื่อหรือข้อมูลระบุตัวตน\) ไปถอดความด้วยระบบ AI ภายนอก เพื่อให้ได้ข้อความที่แม่นยำ'", "label: t('intake.consent.cb3label')"),
    (r"note: 'ไม่ยินยอมก็ได้ — เจ้าหน้าที่จะพิมพ์หรือจดคำตอบแทน \(ยังบันทึกเสียงเก็บไว้ในระบบตามปกติ\)'", "note: t('intake.consent.cb3note')"),
    (r"Check className=\"w-4 h-4\" /> ยินยอม เริ่มต้นการสัมภาษณ์", "Check className=\"w-4 h-4\" /> {t('intake.consent.start')}"),
    (r"อ่านนโยบายความเป็นส่วนตัว \(PDPA\) และสิทธิของคุณ", "{t('intake.consent.privacyLink')}"),
    (r"ยังไม่พร้อม / ไม่ยินยอมในขณะนี้", "{t('intake.consent.notReady')}"),

    # Reporter
    (r"ข้อมูลผู้แจ้ง / ผู้ร้องเรียน", "{t('intake.reporter.eyebrow')}"),
    (r"h1 className=\"text-xl font-medium mt-1 mb-4\">ข้อมูลผู้แจ้ง", "h1 className=\"text-xl font-medium mt-1 mb-4\">{t('intake.reporter.title')}"),
    (r"Label className=\"text-xs text-muted-foreground mb-1\.5 block\">สถานะผู้แจ้ง \*", "Label className=\"text-xs text-muted-foreground mb-1.5 block\">{t('intake.reporter.statusLabel')}"),
    (r"ร้องเรียนด้วยตนเอง", "{t('intake.reporter.self')}"),
    (r"ร้องเรียนให้ผู้อื่น", "{t('intake.reporter.other')}"),
    (r"Field label=\"ชื่อ-นามสกุล ผู้แจ้ง \*\"", "Field label={t('intake.reporter.nameLabel')}"),
    (r"placeholder=\"ชื่อ-นามสกุล\"", "placeholder={t('intake.common.namePlaceholder')}"),
    (r"Field label=\"ที่อยู่ที่ติดต่อได้\"", "Field label={t('intake.reporter.addressLabel')}"),
    (r"placeholder=\"ที่อยู่ปัจจุบัน หรือที่สามารถติดต่อกลับได้\"", "placeholder={t('intake.reporter.addressPlaceholder')}"),
    (r"Field label=\"เบอร์ติดต่อกลับ \*\"", "Field label={t('intake.reporter.phoneLabel')}"),
    (r"toast\.error\('กรุณากรอกชื่อผู้แจ้ง'\)", "toast.error(t('intake.reporter.errName'))"),

    # Victim
    (r"ข้อมูลผู้ถูกละเมิด / ผู้รับบริการ", "{t('intake.victim.eyebrow')}"),
    (r"h1 className=\"text-xl font-medium mt-1 mb-4\">ข้อมูลผู้รับบริการ", "h1 className=\"text-xl font-medium mt-1 mb-4\">{t('intake.victim.title')}"),
    (r"Copy className=\"w-3\.5 h-3\.5\" /> ใช้ข้อมูลเดียวกับผู้แจ้ง", "Copy className=\"w-3.5 h-3.5\" /> {t('intake.victim.copyFromReporter')}"),
    (r"toast\.success\('คัดลอกข้อมูลจากผู้แจ้งแล้ว'\)", "toast.success(t('intake.victim.copied'))"),
    (r"Field label=\"ชื่อ-นามสกุล ผู้ถูกละเมิด \*\"", "Field label={t('intake.victim.nameLabel')}"),
    (r"Field label=\"ที่อยู่และเบอร์ติดต่อ\"", "Field label={t('intake.victim.contactLabel')}"),
    (r"placeholder=\"ที่อยู่ปัจจุบัน \+ เบอร์โทร\"", "placeholder={t('intake.victim.contactPlaceholder')}"),
    (r"SectionDivider>ข้อมูลพื้นฐาน", "SectionDivider>{t('intake.victim.basicInfo')}"),
    (r"Field label=\"พื้นที่รับเรื่อง \(จังหวัด / อำเภอ / ตำบล\) \*\"", "Field label={t('intake.victim.areaLabel')}"),
    (r"Field label=\"กลุ่มประชากร \(KP\) \*\"", "Field label={t('intake.victim.kpLabel')}"),
    (r"KP_GROUPS\.map\(\(b\) => <SelectItem key=\{b\} value=\{b\}>\{b\}</SelectItem>\)", 
     "KP_GROUPS.map((b, i) => <SelectItem key={b} value={b}>{t(`screening.kp.${i}` as any)}</SelectItem>)"),
    (r"Field label=\"เพศสภาพ \*\"", "Field label={t('intake.victim.genderLabel')}"),
    (r"GENDERS\.map\(\(b\) => <SelectItem key=\{b\} value=\{b\}>\{b\}</SelectItem>\)", 
     "GENDERS.map((b, i) => <SelectItem key={b} value={b}>{t(`screening.gender.${i}` as any)}</SelectItem>)"),
    (r"Field label=\"วัน/เดือน/ปีเกิด \*\"", "Field label={t('intake.victim.dobLabel')}"),
    (r"Field label=\"อายุ \(อัตโนมัติ\)\"", "Field label={t('intake.victim.ageLabel')}"),
    (r"placeholder=\"ปี\"", "placeholder={t('intake.victim.agePlaceholder')}"),
    (r"calcAge\(iso\)\s*\}}", "calcAge(iso) })}"), # Ensure we don't mess up DobPicker call
    # Special fix for calcAge
    (r"return `\$\{age\} ปี`;", "return t('intake.victim.ageYears', { age });"),
    (r"Field label=\"สัญชาติ\"", "Field label={t('intake.victim.nationalityLabel')}"),
    (r"placeholder=\"เช่น ไทย, เมียนมา\.\.\.\"", "placeholder={t('intake.victim.nationalityPlaceholder')}"),
    (r"SectionDivider>ประเด็นเบื้องต้น", "SectionDivider>{t('intake.victim.initialIssues')}"),
    (r"Field label=\"พื้นที่เกิดเหตุ\"", "Field label={t('intake.victim.incidentPlaceLabel')}"),
    (r"placeholder=\"เช่น ห้องพักย่านสีลม / ที่ทำงาน / ออนไลน์\"", "placeholder={t('intake.victim.incidentPlacePlaceholder')}"),
    (r"ประเภทการละเมิด \(เลือกเบื้องต้น\) \*", "{t('intake.victim.violationTypeLabel')}"),
    (r"VIOLATION_TYPES\.map\(\(vt, i\) => \{", "VIOLATION_TYPES.map((vt, i) => {\n          const label = t(`screening.violationType.${vt.id}` as any);"),
    (r"vt\.label\.replace\('ละเมิด', ''\)", "label.replace(t('intake.row.type'), '')"), # Wait, 'ละเมิด' is 'type'? No.
    # Actually, vt.label is "สิทธิ์แรงงาน" etc. The replace 'ละเมิด' seems to be a leftover.
    # I'll just use the translated label.
    (r"\{vt\.label\.replace\('ละเมิด', ''\)\}", "{t(`screening.violationType.${vt.id}` as any)}"),
    (r"toast\.error\('กรุณากรอกชื่อผู้รับบริการ'\)", "toast.error(t('intake.victim.errName'))"),
    (r"toast\.error\('กรุณาเลือกประเภทการละเมิด'\)", "toast.error(t('intake.victim.errViolationType'))"),
    (r"ถัดไป: เริ่มสัมภาษณ์", "{t('intake.victim.nextBtn')}"),

    # Voice Step
    (r"toast\.error\('ไม่สามารถเข้าถึงไมโครโฟน — ' \+ \(e\?\.message \|\| ''\)\)", "toast.error(t('intake.voice.micError', { msg: e?.message || '' }))"),
    (r"toast\.info\('บันทึกเสียงแล้ว — ไม่ได้ยินยอมให้ถอดความภายนอก กรุณาพิมพ์หรือจดคำตอบ'\)", "toast.info(t('intake.voice.noConsentRecorded'))"),
    (r"toast\.success\('ถอดความด้วย AI เรียบร้อย'\)", "toast.success(t('intake.voice.transcribeSuccess'))"),
    (r"toast\.info\('ไม่พบคำพูดในไฟล์เสียง กรุณาพิมพ์คำตอบ'\)", "toast.info(t('intake.voice.noSpeechFound'))"),
    (r"toast\.error\('ถอดความอัตโนมัติไม่สำเร็จ — ใช้ข้อความที่แสดงสดหรือพิมพ์เพิ่มได้'\)", "toast.error(t('intake.voice.transcribeError'))"),
    (r"toast\.info\('กรุณาหยุดบันทึกเสียงก่อน'\)", "toast.info(t('intake.voice.stopFirst'))"),
    (r"สนทนาคัดกรอง · คำถามที่ \{qIndex \+ 1\} จาก \{total\}", "{t('intake.voice.progress', { current: qIndex + 1, total })}"),
    (r"เริ่มการสัมภาษณ์ — ตอบได้ทั้งเสียงและพิมพ์", "{t('intake.voice.introBubble')}"),
    (r"\{ans\.transcript \|\| '\(ไม่มีคำตอบ\)'\}", "{ans.transcript || t('intake.voice.noAnswer')}"),
    (r"บันทึกเจ้าหน้าที่: \{staffObs\[i\]\}", "{t('intake.voice.staffNotePrefix', { note: staffObs[i] })}"),
    (r"แก้ไขคำตอบนี้", "{t('intake.voice.editAnswer')}"),
    (r"AI กำลังถอดเสียงเป็นข้อความ\.\.\.", "{t('intake.voice.transcribing')}"),
    (r"placeholder=\"พิมพ์คำตอบ หรือกดไมค์เพื่อพูด\.\.\.\"", "placeholder={t('intake.voice.composerPlaceholder')}"),
    (r"aria-label=\"record\"", "aria-label={t('intake.voice.recordAria')}"),
    (r"กำลังบันทึกเสียง \{mm\}:\{ss\} — กดไมค์อีกครั้งเพื่อหยุด", "{t('intake.voice.recordingTime', { time: `${mm}:${ss}` })}"),
    (r"รอผลถอดความสักครู่\.\.\.", "{t('intake.voice.waitingTranscribe')}"),
    (r"allowServerStt \? 'พูดได้เลย ระบบถอดเสียงให้อัตโนมัติ' : 'ไม่ได้ยินยอมถอดความภายนอก — พิมพ์คำตอบเอง'", 
     "allowServerStt ? t('intake.voice.speakHint') : t('intake.voice.noConsentHint')"),
    (r"ย้อนกลับ", "{t('common.back')}"),
    (r"isLast \? 'เสร็จสิ้นการสัมภาษณ์' : 'ส่งคำตอบ'", "isLast ? t('intake.voice.finishInterview') : t('intake.voice.sendAnswer')"),
    (r"บันทึกของเจ้าหน้าที่ \{obs && !showObs \? '· มีบันทึกแล้ว' : ''\}", "{t('intake.voice.staffObsToggle')} {obs && !showObs ? `· ${t('intake.voice.hasNote')}` : ''}"),
    (r"placeholder=\"ลักษณะที่สังเกต / ข้อเท็จจริงเพิ่มเติม เช่น ร่องรอยฟกช้ำ, สีหน้าหวาดกลัว\.\.\.\"", "placeholder={t('intake.voice.obsPlaceholder')}"),

    # QuestionBubble
    (r"คำถามที่ \{index \+ 1\}", "t('intake.voice.questionNumber', { n: index + 1 })"),
    (r"\{q\.cat\}", "{t(q.cat as any)}"),
    (r"\{q\.main\}", "{t(q.main as any)}"),
    (r"\{q\.hint\}", "{t(q.hint as any)}"),

    # Assess
    (r"h1 className=\"text-lg font-medium\">ประเมินสภาพปัญหา", "h1 className=\"text-lg font-medium\">{t('intake.assess.title')}"),
    (r"เจ้าหน้าที่ประเมินก่อนส่งให้ AI วิเคราะห์", "{t('intake.assess.subtitle')}"),
    (r"Card title=\"1\. มีการละเมิดสิทธิ์เกิดขึ้นหรือไม่\?\"", "Card title={t('intake.assess.q1title')}"),
    (r">ใช่ มีการละเมิด<", ">{t('intake.assess.yes')}<"),
    (r">ไม่ใช่<", ">{t('intake.assess.no')}<"),
    (r"Card title=\"2\. ละเมิดสิทธิ์ด้านใด \(เลือกได้หลายข้อ\)\"", "Card title={t('intake.assess.q2title')}"),
    (r"Card title=\"3\. ระดับความรุนแรงของปัญหา\"", "Card title={t('intake.assess.q3title')}"),
    (r"s === 'green' \? 'เขียว' : s === 'yellow' \? 'เหลือง' : 'แดง'", "t(`intake.severity.${s}` as any)"),
    (r"เขียว: ไม่เร่งด่วน · เหลือง: ติดตามใกล้ชิด · แดง: ฉุกเฉิน ต้องดำเนินการทันที", "{t('intake.assess.severityLegend')}"),
    (r"Card title=\"4\. แบบทดสอบพิเศษที่ควรทำ\"", "Card title={t('intake.assess.q4title')}"),
    (r"\{done \? '✓ ทำแล้ว' : 'ทำแล้ว'\}", "{done ? t('intake.assess.done') : t('intake.assess.markDone')}"),
    (r"Card title=\"4\.1 แบบคัดกรองมาตรฐาน 2Q / 9Q / NRM\"", "Card title={t('intake.assess.q41title')}"),
    (r"Card title=\"5\. สอบข้อเท็จจริงเพิ่มเติม / บันทึกการลงพื้นที่\"", "Card title={t('intake.assess.q5title')}"),
    (r"placeholder=\"บันทึกข้อเท็จจริงเพิ่มเติม การลงพื้นที่ พยานหลักฐาน\.\.\.\"", "placeholder={t('intake.assess.extraFactsPlaceholder')}"),
    (r"toast\.error\('กรุณาตอบข้อ 1'\)", "toast.error(t('intake.assess.errQ1'))"),
    (r"toast\.error\('กรุณาเลือกระดับความรุนแรง'\)", "toast.error(t('intake.assess.errSeverity'))"),
    (r"Sparkles className=\"w-4 h-4\" /> วิเคราะห์ด้วย AI", "Sparkles className=\"w-4 h-4\" /> {t('intake.assess.analyzeBtn')}"),

    # AI
    (r"stepLabel = 'กำลังประมวลผลคำตอบ'", "stepLabel = t('intake.ai.step1')"),
    (r"\['กำลังประมวลผลคำตอบ', 'ตรวจสอบรูปแบบการละเมิด', 'ประเมินความเสี่ยง', 'สร้างคำแนะนำเพิ่มเติม'\]", 
     "[t('intake.ai.step1'), t('intake.ai.step2'), t('intake.ai.step3'), t('intake.ai.step4')]"),
    (r"setError\(e\?\.message \|\| 'การวิเคราะห์ล้มเหลว'\)", "setError(e?.message || t('intake.ai.failed'))"),
    (r"AI กำลังวิเคราะห์การสัมภาษณ์<br />กรุณารอสักครู่", "{t('intake.ai.analyzing')}<br />{t('intake.ai.pleaseWait')}"),
    (r"การวิเคราะห์ล้มเหลว", "{t('intake.ai.failed')}"),
    (r"ลองใหม่", "{t('intake.ai.retry')}"),
    (r"SkipForward className=\"w-4 h-4\" /> ข้ามการวิเคราะห์ AI และบันทึกเคสต่อ", "SkipForward className=\"w-4 h-4\" /> {t('intake.ai.skip')}"),
    (r"เคสจะถูกบันทึกครบถ้วนโดยใช้การประเมินของเจ้าหน้าที่เป็นหลัก", "{t('intake.ai.skipNote')}"),
    (r"ผลการวิเคราะห์โดย AI", "{t('intake.ai.resultTitle')}"),
    (r"เคสใหม่ · \{new Date\(\)\.toLocaleDateString\('th-TH'\)\}", "{t('intake.ai.newCase', { date: new Date().toLocaleDateString('th-TH') })}"),
    (r"ผลนี้เป็นเพียงข้อมูลช่วยตัดสินใจ ไม่ใช่คำวินิจฉัยทางกฎหมายหรือการแพทย์ เจ้าหน้าที่ต้องทบทวนก่อนเสมอ", "{t('intake.ai.disclaimer')}"),
    (r"ระดับความเสี่ยงที่ประเมินได้", "{t('intake.ai.riskLevel')}"),
    (r"r\.riskLevel === 'high' \? '⚠️ ความเสี่ยงสูง — แนะนำดำเนินการทันที' : r\.riskLevel === 'medium' \? 'ความเสี่ยงปานกลาง — ติดตามใกล้ชิด' : 'ความเสี่ยงต่ำ — ติดตามตามรอบ'", 
     "r.riskLevel === 'high' ? t('intake.ai.riskHigh') : r.riskLevel === 'medium' ? t('intake.ai.riskMed') : t('intake.ai.riskLow')"),
    (r"สรุปสถานการณ์", "{t('intake.ai.summaryTitle')}"),
    (r"ประเภทการละเมิดที่พบ", "{t('intake.ai.violationTagsTitle')}"),
    (r"คำแนะนำเบื้องต้นสำหรับเจ้าหน้าที่", "{t('intake.ai.recommendationsTitle')}"),
    (r"คำถามเพิ่มเติม \(จาก AI\)", "{t('intake.ai.followupTitle')}"),
    (r"placeholder=\"พิมพ์คำตอบ\.\.\.\"", "placeholder={t('intake.common.typeAnswerPlaceholder')}"),
    (r"ต่อไป: เลือกการส่งต่อ", "{t('intake.ai.nextBtn')}"),

    # Referral
    (r"h1 className=\"text-lg font-medium mb-1\">การส่งต่อ", "h1 className=\"text-lg font-medium mb-1\">{t('intake.referral.title')}"),
    (r"เลือกหน่วยงานสำหรับส่งต่อเคส", "{t('intake.referral.subtitle')}"),
    (r"placeholder=\"บันทึกการส่งต่อ ชื่อหน่วยงาน เบอร์ติดต่อ\.\.\.\"", "placeholder={t('intake.referral.notePlaceholder')}"),
    (r"ถัดไป: ลงนามรับรอง", "{t('intake.referral.nextBtn')}"),

    # Signature
    (r"toast\.error\('กรุณาลงลายเซ็นเจ้าหน้าที่'\)", "toast.error(t('intake.sig.errStaffSig'))"),
    (r"toast\.error\('กรุณากรอกชื่อเจ้าหน้าที่'\)", "toast.error(t('intake.sig.errStaffName'))"),
    (r"toast\.success\(audioPaths\.length\s*\? `บันทึกเคสและไฟล์เสียง \$\{audioPaths\.length\} ไฟล์สำเร็จ`\s*: 'บันทึกเคสสำเร็จ'\)", 
     "toast.success(audioPaths.length ? t('intake.sig.savedWithAudio', { n: audioPaths.length }) : t('intake.sig.saved'))"),
    (r"toast\.error\(`\$\{e\?\.message \|\| 'บันทึกล้มเหลว'\} — เก็บสำเนาไว้ในเครื่องแล้ว ส่งซ้ำได้ที่หน้า /recover`\)", 
     "toast.error(t('intake.sig.saveError', { msg: e?.message || t('intake.sig.saveFailed') }))"),
    (r"สรุปและรับรองความถูกต้อง", "{t('intake.sig.summaryTitle')}"),
    (r"ตรวจสอบข้อมูลทั้งหมดก่อนลงนาม", "{t('intake.sig.summarySubtitle')}"),
    (r"SummaryBlock title=\"ผู้แจ้ง\"", "SummaryBlock title={t('intake.sig.blockReporter')}"),
    (r"SummaryBlock title=\"ผู้ถูกละเมิด\"", "SummaryBlock title={t('intake.sig.blockVictim')}"),
    (r"SummaryBlock title=\"ข้อมูลการละเมิด\"", "SummaryBlock title={t('intake.sig.blockViolation')}"),
    (r"SummaryBlock title=\"การส่งต่อ\"", "SummaryBlock title={t('intake.sig.blockReferral')}"),
    (r"Row k=\"ชื่อ\"", "Row k={t('intake.row.name')}"),
    (r"Row k=\"โทร\"", "Row k={t('intake.row.phone')}"),
    (r"Row k=\"กลุ่ม / เพศ\"", "Row k={t('intake.row.kpGender')}"),
    (r"Row k=\"อายุ / สัญชาติ\"", "Row k={t('intake.row.ageNationality')}"),
    (r"Row k=\"พื้นที่เกิดเหตุ\"", "Row k={t('intake.row.incidentPlace')}"),
    (r"Row k=\"ประเภท\"", "Row k={t('intake.row.type')}"),
    (r"Row k=\"ความรุนแรง\"", "Row k={t('intake.row.severity')}"),
    (r"Row k=\"แบบทดสอบ\"", "Row k={t('intake.row.tests')}"),
    (r"intake\.specialTests\.length \? intake\.specialTests\.join\(', '\)\.toUpperCase\(\) : 'ไม่มี'", 
     "intake.specialTests.length ? intake.specialTests.join(', ').toUpperCase() : t('intake.common.none')"),
    (r"intake\.referrals\.join\(' · '\) \|\| 'ยังไม่ได้เลือก'", "intake.referrals.join(' · ') || t('intake.referral.notSelected')"),
    (r"<strong>คำรับรอง:</strong>", "<strong>{t('intake.sig.certifyLabel')}</strong>"),
    (r"ข้าพเจ้าขอรับรองว่าข้อมูลที่บันทึกในแบบฟอร์มนี้เป็นความจริงทุกประการ และได้รับความยินยอมจากผู้รับบริการในการบันทึกและวิเคราะห์ข้อมูลดังกล่าวแล้ว", 
     "{t('intake.sig.certifyText')}"),
    (r"ลายเซ็นเจ้าหน้าที่", "{t('intake.sig.staffSigLabel')}"),
    (r"เซ็นชื่อที่นี่", "{t('intake.sig.signHere')}"),
    (r"ล้างลายเซ็น", "{t('intake.sig.clearSig')}"),
    (r"placeholder=\"ชื่อ-นามสกุล เจ้าหน้าที่\"", "placeholder={t('intake.sig.staffNamePlaceholder')}"),
    (r"ลายเซ็นผู้รับบริการ \(ถ้ามี\)", "{t('intake.sig.clientSigLabel')}"),
    (r"เซ็นชื่อที่นี่ \(ไม่บังคับ\)", "{t('intake.sig.signHereOptional')}"),
    (r"ยืนยันและบันทึกเคส", "{t('intake.sig.confirmBtn')}"),

    # Confirmed
    (r"h1 className=\"text-lg font-medium\">บันทึกเคสสำเร็จ", "h1 className=\"text-lg font-medium\">{t('intake.confirmed.title')}"),
    (r"เคสของคุณได้รับการบันทึกเรียบร้อยแล้ว", "{t('intake.confirmed.subtitle')}"),
    (r"เลขอ้างอิงเคส", "{t('intake.confirmed.caseCodeLabel')}"),
    (r"toast\.success\('คัดลอกแล้ว'\)", "toast.success(t('intake.confirmed.copied'))"),
    (r"Copy className=\"w-3 h-3\" /> คัดลอกเลขอ้างอิง", "Copy className=\"w-3 h-3\" /> {t('intake.confirmed.copyBtn')}"),
    (r"เก็บเลขนี้ไว้เพื่อติดตามสถานะเคสของคุณในภายหลัง", "{t('intake.confirmed.keepCodeHint')}"),
    (r"alt={`QR code สำหรับติดตามเคส \$\{caseCode\}`\}", "alt={t('intake.confirmed.qrAlt', { code: caseCode || '' })}"),
    (r"สแกนหรือถ่ายภาพ QR นี้เพื่อติดตามสถานะ", "{t('intake.confirmed.qrHint')}"),
    (r"สรุปเคส", "{t('intake.confirmed.caseSummary')}"),
    (r"SummaryBlock title=\"ผู้รับบริการ\"", "SummaryBlock title={t('intake.confirmed.blockClient')}"),
    (r"SummaryBlock title=\"การประเมิน\"", "SummaryBlock title={t('intake.confirmed.blockAssessment')}"),
    (r"Row k=\"พื้นที่\"", "Row k={t('intake.confirmed.rowArea')}"),
    (r"Row k=\"ประเภทการละเมิด\"", "Row k={t('intake.confirmed.rowViolationType')}"),
    (r"Row k=\"9Q / NRM\"", "Row k={t('intake.confirmed.rowScore')}"),
    (r"Row k=\"การส่งต่อ\"", "Row k={t('intake.confirmed.rowReferral')}"),
    (r"\{intake\.screening\.q9\.reduce\(\(a, b\) => a \+ b, 0\)\} คะแนน · \{nrmPositive\(intake\.screening\.nrm, intake\.screening\.nrmUnder18\) \? 'NRM เข้าข่าย' : 'NRM ไม่เข้าเกณฑ์'\}", 
     "{t('intake.confirmed.scorePoints', { score: intake.screening.q9.reduce((a, b) => a + b, 0), nrm: nrmPositive(intake.screening.nrm, intake.screening.nrmUnder18) ? t('intake.confirmed.nrmYes') : t('intake.confirmed.nrmNo') })}"),
    (r"เอกสารสำหรับดำเนินการต่อ \(พิมพ์/บันทึก PDF\)", "{t('intake.confirmed.docsTitle')}"),
    (r"รายงานเคสฉบับเต็ม \(Case Report\)", "{t('intake.confirmed.fullReportBtn')}"),
    (r"พิมพ์เอกสารก่อนกด \"บันทึกเคสใหม่\" — หลังจากนั้นสามารถพิมพ์ซ้ำได้จากหน้า Dashboard ของเจ้าหน้าที่", "{t('intake.confirmed.printHint')}"),
    (r"ติดตามสถานะเคส", "{t('intake.confirmed.trackBtn')}"),
    (r"บันทึกเคสใหม่", "{t('intake.confirmed.newCaseBtn')}"),

    # Misc / SHARED
    (r"<span>เลือกวันเกิด</span>", "<span>{t('intake.dob.placeholder')}</span>"),
    (r"toast\.error\(`ไฟล์ \$\{f\.name\} ใหญ่เกิน 15MB`\)", "toast.error(t('intake.photo.tooLarge', { name: f.name }))"),
    (r"ถ่ายภาพ", "{t('intake.photo.takePhoto')}"),
    (r"แนบรูปภาพ", "{t('intake.photo.attach')}"),
    (r"แนบรูปแล้ว \{[a-z]+\.length\} รูป · ระบบลบข้อมูลพิกัด/EXIF ออกอัตโนมัติ", 
     "{t('intake.photo.attachedCount', { n: photos.length })}"),
]

for pattern, replacement in subs:
    content = re.sub(pattern, replacement, content)

with open('src/pages/Intake.tsx', 'w') as f:
    f.write(content)
