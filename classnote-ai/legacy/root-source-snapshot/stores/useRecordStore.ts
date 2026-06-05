import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RecordingConfig, TimelineMark, MarkType } from '@/types'

/** 原文转写块 */
export interface TranscriptBlock {
  timeRange: string
  title: string
  text: string
  hasMarks: boolean
}

/** 课堂时间线段 */
export interface LectureTimelineItem {
  timeRange: string
  title: string
  whatTaught: string
  teacherEmphasis: string
  relatedMarks: string
}

/** 结构化总结主题 */
export interface StructuredSummaryTopic {
  title: string
  coreConcept: string
  bulletPoints: string[]
}

/** AI 总结 mock 数据结构 */
export interface SummaryResult {
  courseName: string
  date: string
  duration: number
  markCount: number
  accuracy: number
  classFlow: string
  oneSentenceSummary: string
  // 总览 Tab
  keyPoints: string[]
  personalizedItems: { text: string }[]
  reviewTasks: { id: string; title: string; completed: boolean }[]
  // 原文 Tab
  transcriptBlocks: TranscriptBlock[]
  // 时间轴 Tab
  lectureTimeline: LectureTimelineItem[]
  // 总结 Tab
  structuredSummary: StructuredSummaryTopic[]
  // 标记 Tab
  timelineMarks: TimelineMark[]
  // 考点 Tab
  examFocusItems: string[]
  questionTypes: { type: string; description: string }[]
  commonMistakes: { text: string }[]
  // 术语 Tab
  terms: { term: string; chinese: string; explanation: string; relatedConcepts: string; confusingWith?: string }[]
  // 复习 Tab
  reviewPlan: {
    estimatedMinutes: number
    completionRate: string
    steps: { title: string; tasks: { id: string; title: string; completed: boolean }[] }[]
  }
}

export const useRecordStore = defineStore('record', () => {
  // --- 录音配置 ---
  const config = ref<RecordingConfig>({
    courseId: 'c1',
    lectureTitle: '细胞分裂',
    lectureLanguage: 'English',
    summaryLanguage: '中文',
    keepTermsInEnglish: true,
    recordingMode: 'lecture',
    noteStyle: 'balanced',
  })

  // --- Mock 录音状态 ---
  const isRecording = ref(false)
  const isPaused = ref(false)
  const duration = ref(0)
  const accuracy = ref(98)
  const courseName = ref('生物学 101')
  const deviceDisconnected = ref(false)
  const currentSegmentIndex = ref(0)
  const processing = ref(false)

  // --- Mock 转写段落 ---
  const transcriptSegments = ref([
    { id: 's1', time: 0, text: "Good morning everyone. Today we're going to talk about cell division, specifically mitosis and its role in eukaryotic cells." },
    { id: 's2', time: 45, text: "Before we dive into the stages, let's review the cell cycle. The cell cycle consists of interphase and the mitotic phase." },
    { id: 's3', time: 120, text: "Interphase is divided into three sub-phases: G1, S, and G2. During G1, the cell grows and carries out its normal functions." },
    { id: 's4', time: 200, text: "The S phase is when DNA replication occurs. This is crucial because each daughter cell needs a complete set of chromosomes." },
    { id: 's5', time: 280, text: "G2 is the final preparation phase before mitosis. The cell checks for DNA damage and makes final preparations for division." },
  ])

  // --- Mock 时间轴标记 ---
  const marks = ref<TimelineMark[]>([
    {
      id: 'mk1', time: 45, type: 'important',
      label: 'Cell Cycle Review',
      aiExplanation: '细胞周期由间期和有丝分裂期组成，是理解后续内容的关键基础。',
      hasPlayback: true,
    },
    {
      id: 'mk2', time: 120, type: 'exam',
      label: 'Three G1/S/G2 Phases',
      aiExplanation: 'G1/S/G2 三个阶段是历年考试的高频考点，需要记住每个阶段的功能。',
      hasPlayback: true,
    },
    {
      id: 'mk3', time: 200, type: 'confusing',
      label: 'DNA Replication Detail',
      aiExplanation: '教授此处语速较快，您标记了"没太听懂"。DNA复制发生在S期，需要精确复制。',
      hasPlayback: true,
    },
    {
      id: 'mk4', time: 280, type: 'question',
      label: 'G2 Checkpoint',
      aiExplanation: 'G2检查点确保DNA正确复制，如检测到损伤则细胞周期会暂停进行修复。',
      hasPlayback: true,
    },
  ])

  // --- 计算属性 ---
  const markCount = computed(() => marks.value.length)
  const formattedDuration = computed(() => {
    const mins = Math.floor(duration.value / 60)
    const secs = duration.value % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })

  // --- 方法 ---
  function startRecording() {
    isRecording.value = true
    isPaused.value = false
    duration.value = 0
  }

  function pauseRecording() {
    isPaused.value = !isPaused.value
  }

  function resumeRecording() {
    isPaused.value = false
  }

  function stopRecording() {
    isRecording.value = false
    isPaused.value = false
  }

  function endRecording() {
    isRecording.value = false
    isPaused.value = false
    processing.value = true
  }

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  function addMark(type: MarkType, label: string) {
    marks.value.push({
      id: `mk${Date.now()}`,
      time: duration.value,
      type,
      label,
      aiExplanation: '',
      hasPlayback: true,
    })
  }

  function updateConfig(partial: Partial<RecordingConfig>) {
    config.value = { ...config.value, ...partial }
  }

  function setRecordingConfig(cfg: RecordingConfig) {
    config.value = { ...cfg }
  }

  function startMockRecording() {
    isRecording.value = true
    isPaused.value = false
    duration.value = 0
    marks.value = []
  }

  // --- Mock AI 总结结果 (v4: 7-Tab 工作台) ---
  const summaryResult = ref<SummaryResult>({
    courseName: '生物学 101',
    date: '2026年5月28日',
    duration: 3120,
    markCount: 6,
    accuracy: 95,
    classFlow: 'Cell Cycle → Mitosis → Cytokinesis',
    oneSentenceSummary: 'AI 已基于完整转写原文、时间轴标记和课堂内容生成本报告。',
    keyPoints: [
      'S phase 是 DNA replication 发生的阶段',
      'mitosis 负责细胞核分裂，cytokinesis 负责细胞质分裂',
      'G2 checkpoint 检查 DNA damage 并决定是否进入 mitosis',
      '区分 mitosis（2个二倍体）和 meiosis（4个单倍体）',
    ],
    personalizedItems: [
      { text: '本节"细胞分裂机制"与你的生物学专业强相关' },
      { text: '新术语已加入专业词库：mitosis / cytokinesis / centromere' },
      { text: '已关联你上次标记的相似错题' },
    ],
    reviewTasks: [
      { id: 'srt1', title: '复习 Cell Division 10 分钟', completed: false },
      { id: 'srt2', title: '回看 2 个时间轴标记', completed: false },
      { id: 'srt3', title: '对比 mitosis / meiosis', completed: false },
      { id: 'srt4', title: '整理专业术语', completed: false },
    ],
    // --- 原文 Tab ---
    transcriptBlocks: [
      {
        timeRange: '00:00 - 08:45',
        title: '课程导入 & 细胞周期',
        text: "Good morning everyone. Today we're going to talk about cell division, specifically mitosis and its role in eukaryotic cells. Before we dive into the stages, let's review the cell cycle. The cell cycle consists of interphase and the mitotic phase. Interphase is divided into three sub-phases: G1, S, and G2. During G1, the cell grows and carries out its normal functions. The S phase is when DNA replication occurs. This is crucial because each daughter cell needs a complete set of chromosomes. G2 is the final preparation phase before mitosis.",
        hasMarks: true,
      },
      {
        timeRange: '08:45 - 23:12',
        title: '有丝分裂四阶段',
        text: "Now let's look at mitosis itself. Mitosis is divided into four stages: prophase, metaphase, anaphase, and telophase. During prophase, the chromatin condenses into visible chromosomes, and the nuclear envelope begins to break down. In metaphase, chromosomes align at the metaphase plate in the center of the cell. The spindle fibers attach to the kinetochores of each chromosome. During anaphase, sister chromatids are pulled apart toward opposite poles of the cell. Telophase is when nuclear envelopes reform around the separated chromosomes.",
        hasMarks: true,
      },
      {
        timeRange: '23:12 - 31:05',
        title: '细胞质分裂',
        text: "After mitosis completes, cytokinesis occurs. In animal cells, a cleavage furrow forms and pinches the cell into two daughter cells. In plant cells, a cell plate forms instead. It's important to remember that cytokinesis is NOT chromosome separation—that's mitosis's job. Cytokinesis handles the distribution of cytoplasm and organelles to the two new daughter cells. This is a common point of confusion on exams.",
        hasMarks: true,
      },
      {
        timeRange: '31:05 - 45:30',
        title: '细胞周期调控 & Checkpoints',
        text: "The cell cycle is tightly regulated by checkpoints. The G1 checkpoint verifies that conditions are favorable for division. The G2 checkpoint ensures DNA has been properly replicated without damage. If damage is detected, the cycle pauses for repair. Failure of these checkpoints can lead to uncontrolled cell division—cancer. The M checkpoint during metaphase ensures all chromosomes are properly attached to spindle fibers before anaphase proceeds.",
        hasMarks: false,
      },
      {
        timeRange: '45:30 - 52:00',
        title: 'Mitosis vs Meiosis 对比 & 总结',
        text: "Let's compare mitosis and meiosis. Mitosis produces two genetically identical diploid daughter cells—this is for growth and repair. Meiosis produces four genetically unique haploid cells—this is for reproduction. The key differences: number of divisions, chromosome number, genetic variation, and purpose. Remember: mitosis = 1 division → 2 diploid cells; meiosis = 2 divisions → 4 haploid cells. This will definitely be on the exam.",
        hasMarks: true,
      },
    ],
    // --- 时间轴 Tab ---
    lectureTimeline: [
      {
        timeRange: '00:00 - 08:45',
        title: '课程导入 & 细胞周期回顾',
        whatTaught: '回顾细胞周期的基本结构，详细讲解间期的 G1/S/G2 三个子阶段及其功能。',
        teacherEmphasis: '"G2 checkpoint 是考试中最容易被忽略的重点，因为它不是主动分裂的步骤，但它在调控中非常关键。"',
        relatedMarks: 'Cell Cycle Review (重要标记，00:45)',
      },
      {
        timeRange: '08:45 - 23:12',
        title: '有丝分裂四个阶段',
        whatTaught: '详细讲解前期、中期、后期和末期四个阶段的染色体行为变化。',
        teacherEmphasis: '"Metaphase 的染色体排列在赤道板上——这个图一定会考，要能画出每个阶段染色体的形态。"',
        relatedMarks: 'Three G1/S/G2 Phases (考点标记，02:00)',
      },
      {
        timeRange: '23:12 - 31:05',
        title: '细胞质分裂',
        whatTaught: '讲解 cytokinesis 的过程，对比动物细胞和植物细胞的分裂方式差异。',
        teacherEmphasis: '"Mitosis is NOT cytokinesis. Mitosis divides the nucleus, cytokinesis divides the cytoplasm. 这是考试陷阱。"',
        relatedMarks: 'DNA Replication Detail (疑问标记，03:20)',
      },
      {
        timeRange: '31:05 - 45:30',
        title: '细胞周期调控',
        whatTaught: '介绍 G1/G2/M 三个 checkpoints 的作用机制和癌症发生的关联。',
        teacherEmphasis: '"Checkpoint failure → cancer. This is a classic exam question. You need to know ALL three checkpoints."',
        relatedMarks: 'G2 Checkpoint (疑问标记，04:40)',
      },
      {
        timeRange: '45:30 - 52:00',
        title: 'Mitosis vs Meiosis & 总结',
        whatTaught: '对比 mitosis 和 meiosis 在分裂次数、染色体数目、遗传变异和功能上的差异。',
        teacherEmphasis: '"This WILL be on the exam. I cannot emphasize this enough—know the difference between mitosis and meiosis."',
        relatedMarks: 'mitosis vs meiosis 区别 (考点标记，45:30)',
      },
    ],
    // --- 总结 Tab ---
    structuredSummary: [
      {
        title: 'Cell Cycle 细胞周期',
        coreConcept: '细胞周期由间期（G1/S/G2）和有丝分裂期组成，是细胞生长和分裂的完整过程。',
        bulletPoints: [
          'G1 期：细胞生长，执行正常功能',
          'S 期：DNA 复制，每条染色体变成两条姐妹染色单体',
          'G2 期：分裂前最后准备，检查 DNA 损伤',
        ],
      },
      {
        title: 'Mitosis 有丝分裂',
        coreConcept: '有丝分裂是细胞核分裂的过程，产生两个遗传信息完全相同的子核。',
        bulletPoints: [
          '前期：染色质凝缩，核膜解体，纺锤体形成',
          '中期：染色体排列在赤道板，纺锤丝连接着丝粒',
          '后期：姐妹染色单体被拉向细胞两极',
          '末期：核膜重新形成，染色体解旋',
        ],
      },
      {
        title: 'Cytokinesis 细胞质分裂',
        coreConcept: '细胞质分裂将母细胞的细胞质和细胞器分配给两个子细胞。',
        bulletPoints: [
          '动物细胞：细胞膜内陷形成分裂沟',
          '植物细胞：形成细胞板',
          '注意：不是染色体分离（那是 mitosis 的职责）',
        ],
      },
      {
        title: 'Mitosis vs Meiosis 对比',
        coreConcept: '有丝分裂产生 2 个二倍体子细胞，减数分裂产生 4 个单倍体子细胞。',
        bulletPoints: [
          '分裂次数：mitosis = 1 次，meiosis = 2 次',
          '子细胞数：2 vs 4',
          '遗传信息：完全相同 vs 各不相同',
          '功能：生长修复 vs 生殖',
        ],
      },
    ],
    // --- 标记 Tab ---
    timelineMarks: [
      { id: 'smk1', time: 525, type: 'confusing', label: 'metaphase 染色体排列', aiExplanation: '这里主要讲的是 metaphase，染色体会排列在细胞中央的赤道板上，方便后续纺锤丝将它们均匀拉开。', hasPlayback: true },
      { id: 'smk2', time: 1392, type: 'important', label: 'G2 checkpoint 检查 DNA damage', aiExplanation: '这是考试中常见考点，G2 checkpoint 确保 DNA 在复制后没有损伤，如有问题细胞周期会暂停进行修复。', hasPlayback: true },
      { id: 'smk3', time: 1865, type: 'review', label: 'mitosis 和 cytokinesis 的区别', aiExplanation: 'mitosis 是细胞核分裂（染色体分离），cytokinesis 是细胞质分裂。前者将遗传物质分给两个子核，后者将整个细胞一分为二。两者不可混淆。', hasPlayback: true },
      { id: 'smk4', time: 2730, type: 'exam', label: 'mitosis 和 meiosis 的区别', aiExplanation: 'mitosis 产生两个遗传信息相同的二倍体子细胞，meiosis 产生四个遗传信息不同的单倍体子细胞。这是历年考试的高频考点。', hasPlayback: true },
    ],
    // --- 考点 Tab ---
    examFocusItems: [
      '解释 mitosis 和 meiosis 的区别',
      '描述 cell cycle 的主要阶段',
      '判断 DNA replication 发生在哪个阶段',
      '理解 G2 checkpoint 的作用',
      '区分 mitosis 和 cytokinesis',
    ],
    questionTypes: [
      { type: '选择题', description: '判断 DNA replication 发生在细胞周期的哪个阶段' },
      { type: '简答题', description: '解释 mitosis 与 cytokinesis 的区别和关系' },
      { type: '图示题', description: '识别有丝分裂各个阶段的染色体特征' },
    ],
    commonMistakes: [
      { text: 'cytokinesis 不是染色体分离，而是细胞质分裂' },
      { text: 'mitosis 和 meiosis 的结果不同：2个二倍体 vs 4个单倍体' },
      { text: 'S phase 是 DNA replication，不是 cell division' },
    ],
    // --- 术语 Tab ---
    terms: [
      {
        term: 'mitosis', chinese: '有丝分裂',
        explanation: '产生两个遗传信息相同的子细胞',
        relatedConcepts: 'chromosome / cytokinesis / cell cycle',
      },
      {
        term: 'cytokinesis', chinese: '细胞质分裂',
        explanation: '将一个母细胞分成两个独立子细胞',
        relatedConcepts: 'mitosis / cleavage furrow / cell plate',
        confusingWith: '它不是核分裂，核分裂是 mitosis',
      },
      {
        term: 'centromere', chinese: '着丝粒',
        explanation: '连接姐妹染色单体的结构',
        relatedConcepts: 'chromosome / kinetochore / anaphase',
      },
      {
        term: 'chromosome', chinese: '染色体',
        explanation: '承载遗传信息的结构',
        relatedConcepts: 'DNA / chromatin / sister chromatids',
      },
      {
        term: 'interphase', chinese: '间期',
        explanation: '细胞生长和 DNA 复制阶段',
        relatedConcepts: 'G1 / S / G2 / cell cycle',
      },
    ],
    // --- 复习 Tab ---
    reviewPlan: {
      estimatedMinutes: 18,
      completionRate: '80%',
      steps: [
        {
          title: '第一步：补懂',
          tasks: [
            { id: 'rp1', title: '回看 00:08:45 的 metaphase 标记', completed: false },
            { id: 'rp2', title: '阅读 G2 checkpoint 的 AI 解释', completed: false },
          ],
        },
        {
          title: '第二步：记忆',
          tasks: [
            { id: 'rp3', title: '复习 5 个专业术语', completed: false },
            { id: 'rp4', title: '完成 5 张记忆卡片', completed: false },
          ],
        },
        {
          title: '第三步：检测',
          tasks: [
            { id: 'rp5', title: '完成 3 道相似题', completed: false },
            { id: 'rp6', title: '对比 mitosis / meiosis', completed: false },
          ],
        },
      ],
    },
  })

  const hasSummaryData = computed(() => summaryResult.value.courseName !== '')

  function toggleSummaryReviewTask(taskId: string) {
    const task = summaryResult.value.reviewTasks.find((t) => t.id === taskId)
    if (task) task.completed = !task.completed
  }

  function toggleReviewPlanTask(taskId: string) {
    for (const step of summaryResult.value.reviewPlan.steps) {
      const task = step.tasks.find((t) => t.id === taskId)
      if (task) { task.completed = !task.completed; return }
    }
  }

  function addNote() {
    // mock: 不做实际持久化
  }

  function resetSession() {
    isRecording.value = false
    isPaused.value = false
    duration.value = 0
    marks.value = []
    processing.value = false
    deviceDisconnected.value = false
  }

  return {
    // state
    config, isRecording, isPaused, duration, accuracy,
    courseName, deviceDisconnected, currentSegmentIndex, processing,
    transcriptSegments, marks, summaryResult,
    // getters
    markCount, formattedDuration, hasSummaryData,
    // methods
    startRecording, pauseRecording, resumeRecording, stopRecording,
    endRecording, formatDuration, addMark, updateConfig,
    setRecordingConfig, startMockRecording,
    toggleSummaryReviewTask, toggleReviewPlanTask,
    addNote, resetSession,
  }
})
