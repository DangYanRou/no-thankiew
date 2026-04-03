import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '../store/gameStore'
import type { Difficulty, GameMode } from 'shared'
import logo from '../assets/logo.svg'

export default function Home() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { connect, createRoom, joinRoom, roomCode, isHost, state, error } = useGameStore()

  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [mode, setMode] = useState<GameMode>('multi')
  const [joinCode, setJoinCode] = useState('')
  const [name, setName] = useState('')
  const [tab, setTab] = useState<'host' | 'join'>('host')
  const [showRules, setShowRules] = useState(false)

  useEffect(() => { connect() }, [connect])

  useEffect(() => {
    if (isHost && roomCode) navigate(`/master/${roomCode}`)
  }, [isHost, roomCode, navigate])

  useEffect(() => {
    if (!isHost && state && roomCode) navigate(`/play/${roomCode}`)
  }, [isHost, state, roomCode, navigate])

  const handleJoin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!joinCode.trim() || !name.trim()) return
    joinRoom(joinCode.trim().toUpperCase(), name.trim())
  }

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'zh' : 'en'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  const difficulties: { value: Difficulty; label: string; desc: string }[] = [
    { value: 'easy', label: t('difficulty.easy'), desc: t('home.easyDesc') },
    { value: 'medium', label: t('difficulty.medium'), desc: t('home.mediumDesc') },
    { value: 'hard', label: t('difficulty.hard'), desc: t('home.hardDesc') },
  ]

  return (
    <div style={{ padding: '20px' }}
      className="min-h-svh flex flex-col items-center justify-center gap-8">

      {/* Logo + Title */}
      <div className="flex flex-col items-center gap-2">

        <div className="w-[130px] h-[130px] overflow-hidden flex items-center justify-center">
          <img
            src={logo}
            alt="No Thankiew!"
            className="w-full h-full object-contain scale-[2.0] drop-shadow"
          />
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-green-dark tracking-tight">{t('app.title')}</h1>
          <p className="text-green-dark/40 text-sm mt-1">{t('app.subtitle')}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div
        className="flex bg-green-dark/10 rounded-2xl w-full max-w-sm shadow-inner h-10">
        {(['host', 'join'] as const).map(tabKey => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`flex-1 py-2.5 rounded-xl text-base font-bold transition-all duration-200 ${tab === tabKey
              ? 'bg-green-dark text-cream shadow-md'
              : 'text-green-dark/60 hover:text-green-dark hover:bg-green-dark/5'
              }`}
          >
            {tabKey === 'host' ? t('home.hostTab') : t('home.joinTab')}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="w-full max-w-sm bg-green-cream/5 rounded-3xl p-6">

        {/* Host Panel */}
        {tab === 'host' && (
          <div className="flex flex-col gap-5 mt-2">

            {/* Mode Selector */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-green-dark/100 uppercase tracking-widest mt-1">{t('home.modeLabel')}</p>

              <div className="grid grid-cols-2 gap-3">
                {([
                  ['multi', t('home.multiDevice'), t('home.multiDeviceDesc')],
                  ['single', t('home.singleDevice'), t('home.singleDeviceDesc')]
                ] as [GameMode, string, string][]).map(([m, label, desc]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{ padding: '5px' }}
                    className={`flex flex-col items-center text-center p-3 rounded-2xl border-2 transition-all duration-200 ${mode === m
                      ? 'border-green-dark/100 bg-green-dark/20 shadow-sm'
                      : 'border-green-dark/10 hover:border-green-dark/20 bg-cream/60'
                      }`}
                  >
                    <span className="text-sm font-bold">{label}</span>
                    <span className="text-[10px] font-medium opacity-70 mt-1 leading-tight">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs font-semibold text-green-dark/100 uppercase tracking-widest mt-1">{t('home.difficultyLabel')}</p>

            {difficulties.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setDifficulty(value)}
                className={` p-4 rounded-2xl border-2 transition-all h-15 ${difficulty === value
                  ? 'border-green-dark/100 bg-green-dark/20 shadow-sm'
                  : 'border-green-dark/10 hover:border-green-dark/20 bg-cream/60'
                  }`}
              >
                <span className="font-semibold text-green-dark">{label}</span>
                <p className="text-xs text-green-dark/50 mt-0.5">{desc}</p>
              </button>
            ))}

            <button
              onClick={() => createRoom(difficulty, mode)}
              className="w-full py-5 rounded-2xl bg-green-dark text-cream font-semibold hover:bg-green-dark/90 active:scale-95 transition-all mt-1 h-10"
            >
              {t('home.createRoom')}
            </button>
          </div>
        )}

        {/* Join Panel */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-green-dark/100 uppercase tracking-widest">{t('home.roomCode')}</label>
              <input
                type="text"
                placeholder={t('home.roomCodePlaceholder')}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoFocus
                className="w-full rounded-2xl border-2 border-green-dark/10 h-12 p-4 focus:border-dark-green focus:outline-none bg-cream text-green-dark placeholder:text-green-dark/20 font-mono text-center tracking-[0.4em] uppercase text-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-green-dark/100 uppercase tracking-widest">{t('home.yourName')}</label>
              <input
                type="text"
                placeholder={t('home.yourNamePlaceholder')}
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={20}
                className="w-full h-12 indent-4 pr-4 rounded-2xl border-2 border-green-dark/10 focus:border-dark-green focus:outline-none bg-cream text-green-dark placeholder:text-green-dark/20"
              />
            </div>

            <button
              type="submit"
              disabled={!joinCode.trim() || !name.trim()}
              className="w-full py-5 rounded-2xl bg-green-dark/50 text-cream font-semibold hover:bg-green-dark active:scale-95 transition-all mt-1 h-10 disabled:cursor-not-allowed"
            >
              {t('home.joinRoom')}
            </button>
          </form>
        )}
      </div>

      {error && (
        <p className="text-red text-sm font-medium bg-red/8 px-5 py-2.5 rounded-xl">{error}</p>
      )}

      {/* Bottom row: How to Play + Language toggle */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => setShowRules(true)}
          className="text-sm text-green-dark/40 hover:text-green-dark transition-colors underline underline-offset-4"
        >
          {t('home.howToPlay')}
        </button>

        <button
          onClick={toggleLang}
          style={{ padding: '5px' }}
          className="text-sm font-semibold text-green-dark/40 hover:text-green-dark transition-colors border border-green-dark/20 rounded-lg px-3 py-1 hover:border-green-dark/50"
        >
          {i18n.language === 'en' ? '中文' : 'EN'}
        </button>
      </div>

      {/* Rules modal */}
      {showRules && (
        <div
          style={{ padding: '50px' }}
          className="fixed inset-0 z-50 flex flex-col bg-cream overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 bg-cream z-10">
            <h2 className="text-xl font-black text-green-dark">{t('rules.title')}</h2>
            <div className='flex sticky top-0'>
              <button
                onClick={() => setShowRules(false)}
                className="w-9 h-9 rounded-full bg-green-dark/8 flex items-center justify-center text-green-dark font-bold hover:bg-green-dark/15 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-8 px-6 py-8 max-w-lg mx-auto w-full">

            {/* Objective */}
            <section className="flex flex-col gap-2">
              <h3 style={{ marginTop: '10px' }}
                className="text-xs font-bold text-green-dark/40 uppercase tracking-widest">{t('rules.objectiveHeading')}</h3>
              <p className="text-green-dark font-medium leading-relaxed">
                {t('rules.objectiveBody')}
              </p>
            </section>

            {/* Setup */}
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-green-dark/40 uppercase tracking-widest">{t('rules.setupHeading')}</h3>
              <ul className="flex flex-col gap-3 text-green-dark">
                {([
                  t('rules.setupItem1'),
                  t('rules.setupItem2'),
                  t('rules.setupItem3'),
                ]).map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-green-dark/10 text-green-dark text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Turn */}
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-green-dark/40 uppercase tracking-widest">{t('rules.turnHeading')}</h3>
              <div className="flex flex-col gap-2">
                <div style={{ padding: '10px' }}
                  className="rounded-2xl bg-green-dark/5">
                  <p className="text-sm font-bold text-green-dark mb-1">{t('rules.turn1Heading')}</p>
                  <p className="text-sm text-green-dark/70 leading-relaxed">{t('rules.turn1Desc')}</p>
                </div>
                <div style={{ padding: '10px' }}
                  className="rounded-2xl border-2 border-green-dark/20 p-4">
                  <p className="text-sm font-bold text-green-dark mb-1">{t('rules.turn2aHeading')}</p>
                  <p className="text-sm text-green-dark/70 leading-relaxed">{t('rules.turn2aDesc')}</p>
                </div>
                <div style={{ padding: '10px' }}
                  className="rounded-2xl border-2 border-orange/30 p-4">
                  <p className="text-sm font-bold text-orange mb-1">{t('rules.turn2bHeading')}</p>
                  <p className="text-sm text-green-dark/70 leading-relaxed">{t('rules.turn2bDesc')}</p>
                </div>
                <div style={{ padding: '10px' }}
                  className="rounded-2xl bg-red/5 border border-red/20 p-3">
                  <p className="text-xs text-red font-semibold">{t('rules.noChipsWarning')}</p>
                </div>
              </div>
            </section>

            {/* Scoring */}
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-green-dark/40 uppercase tracking-widest">{t('rules.scoringHeading')}</h3>
              <div className="flex flex-col gap-2 text-sm text-green-dark/80 leading-relaxed">
                <p>{t('rules.scoringBody')}</p>
                <div style={{ padding: '10px' }}
                  className="rounded-2xl bg-green-dark/5 p-4 flex flex-col gap-2">
                  <p className="text-xs font-bold text-green-dark/40 uppercase tracking-widest">{t('rules.exampleHeading')}</p>
                  <p className="text-green-dark">{t('rules.exampleLine1')}</p>
                  <p className="text-green-dark">{t('rules.exampleLine2')}</p>
                  <p className="text-green-dark">{t('rules.exampleLine3')}</p>
                </div>
                <p className="text-xs text-green-dark/50">{t('rules.tiebreaker')}</p>
              </div>
            </section>

            {/* Difficulty */}
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-green-dark/40 uppercase tracking-widest">{t('rules.difficultyHeading')}</h3>
              <div className="flex flex-col gap-2">
                {([
                  { label: t('difficulty.easy'), color: 'bg-green-dark/8 text-green-dark', desc: t('rules.easyRulesDesc') },
                  { label: t('difficulty.medium'), color: 'bg-orange/10 text-orange', desc: t('rules.mediumRulesDesc') },
                  { label: t('difficulty.hard'), color: 'bg-red/10 text-red', desc: t('rules.hardRulesDesc') },
                ]).map(({ label, color, desc }) => (
                  <div key={label} style={{ padding: '10px' }} className="rounded-2xl border border-green-dark/10 p-4 flex gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 h-fit ${color}`}>{label}</span>
                    <p className="text-sm text-green-dark/70 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      )}

    </div>
  )
}
