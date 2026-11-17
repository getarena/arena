import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './lib/firebase'
import { getProject } from './lib/firestore'
import { Landing } from './components/Landing'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import { Upload } from './components/Upload'
import { VideoReview } from './components/VideoReview'
import { ClientView } from './components/ClientView'
import { Profile } from './components/Profile'
import { ProjectHub } from './components/ProjectHub'
import { NotFound } from './components/NotFound'
import { ToastHost } from './components/ToastHost'
import { About } from './components/About'
import { PrivacyPolicy, TermsOfService, AcceptableUse, SecurityPage } from './components/LegalPages'
import { Help, Contact } from './components/Help'
import { WorkspaceShell } from './components/WorkspaceShell'
import { ReviewsPage } from './components/ReviewsPage'
import { ActivityPage } from './components/ActivityPage'
import { SettingsPage } from './components/Settings'
import { WorkspaceLoadingSkeleton, ClientLoadingSkeleton, LoginLoadingSkeleton, AboutLoadingSkeleton, ProjectHubLoadingSkeleton } from './components/Skeleton'
import { APP_PATHS, creatorReviewPath, parseArenaRoute, projectPath, pushArenaPath, uploadPath } from './lib/navigation'

function readTheme(key, fallback) {
  const saved = localStorage.getItem(key)
  return saved === 'dark' || saved === 'light' ? saved : fallback
}

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [appTheme, setAppTheme] = useState(() => readTheme('arena:theme', 'light'))
  const [reviewTheme, setReviewTheme] = useState(() => readTheme('arena:reviewTheme', 'dark'))
  const [clientTheme, setClientTheme] = useState(() => readTheme('arena:clientTheme', 'light'))
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const [search, setSearch] = useState(() => window.location.search)
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectLoading, setProjectLoading] = useState(false)
  const [projectError, setProjectError] = useState(null)

  const route = useMemo(() => parseArenaRoute(pathname, search), [pathname, search])

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname)
      setSearch(window.location.search)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    const useWorkspaceTheme = Boolean(user && !['landing', 'login', 'public-info', 'client-review'].includes(route.type))
    document.documentElement.dataset.theme = useWorkspaceTheme ? appTheme : 'light'
    localStorage.setItem('arena:theme', appTheme)
  }, [appTheme, user, route.type])

  useEffect(() => {
    // Arena uses one product accent. Clear legacy custom-accent preferences so older
    // sessions cannot reintroduce the removed accent picker from previous releases.
    localStorage.removeItem('arena:accent')
    document.documentElement.dataset.accent = 'orange'
    document.documentElement.style.setProperty('--arena-accent', '#c94800')
    document.documentElement.style.setProperty('--arena-accent-strong', '#a83e00')
    document.documentElement.style.setProperty('--arena-accent-soft', '#fff0e7')
  }, [])

  useEffect(() => {
    // Canonical workspace landing URL. Keep /dashboard as a backwards-compatible alias.
    if (!authLoading && user && (pathname === '/' || pathname === '/dashboard' || route.type === 'login')) {
      pushArenaPath(APP_PATHS.dashboard, { replace: true })
      return
    }
    if (!authLoading && !user && ['dashboard', 'reviews', 'activity', 'profile', 'settings', 'upload', 'project', 'creator-review'].includes(route.type)) {
      pushArenaPath('/login', { replace: true })
    }
  }, [authLoading, user, pathname, route.type])

  const changeAppTheme = (nextTheme) => setAppTheme(nextTheme)
  const changeReviewTheme = (nextTheme) => { setReviewTheme(nextTheme); localStorage.setItem('arena:reviewTheme', nextTheme) }
  const changeClientTheme = (nextTheme) => { setClientTheme(nextTheme); localStorage.setItem('arena:clientTheme', nextTheme) }

  const navigateTo = (path, options = {}) => {
    pushArenaPath(path, options)
  }

  const navigateView = (nextView) => navigateTo(APP_PATHS[nextView] || APP_PATHS.dashboard)

  const manageProject = (project) => {
    if (!project?.id) return navigateView('dashboard')
    setSelectedProject(project)
    setProjectError(null)
    navigateTo(projectPath(project.id))
  }

  const openProject = (project, videoId = null) => {
    if (!project?.id) return
    const target = creatorReviewPath(project.id, videoId)
    setSelectedProject(project)
    setProjectError(null)
    navigateTo(target)
  }

  const updateSelectedProject = (nextProject) => setSelectedProject(nextProject)

  const openUpload = (projectId = '') => {
    setSelectedProject(null)
    setProjectError(null)
    navigateTo(uploadPath(projectId))
  }

  const backToDashboard = () => {
    setSelectedProject(null)
    setProjectError(null)
    navigateView('dashboard')
  }

  useEffect(() => {
    const projectRoute = route.type === 'project' || route.type === 'creator-review'
    if (!projectRoute || !route.projectId || !user) {
      if (!projectRoute) setProjectLoading(false)
      return
    }

    if (selectedProject?.id === route.projectId) {
      setProjectLoading(false)
      return
    }

    let cancelled = false
    setProjectLoading(true)
    setProjectError(null)
    getProject(route.projectId)
      .then((project) => {
        if (cancelled) return
        if (!project || project.userId !== user.uid) {
          setSelectedProject(null)
          setProjectError('This project could not be found in your workspace.')
          return
        }
        setSelectedProject(project)
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) {
          setSelectedProject(null)
          setProjectError('We could not load this project right now.')
        }
      })
      .finally(() => {
        if (!cancelled) setProjectLoading(false)
      })

    return () => { cancelled = true }
  }, [route.type, route.projectId, user, selectedProject?.id])

  if (authLoading) {
    if (route.type === 'client-review') return <><ClientLoadingSkeleton theme={clientTheme} /><ToastHost /></>
    if (route.type === 'login') return <><LoginLoadingSkeleton /><ToastHost /></>
    if (route.type === 'public-info') return <><AboutLoadingSkeleton /><ToastHost /></>
    return <><WorkspaceLoadingSkeleton /><ToastHost /></>
  }

  if (route.type === 'client-review' && route.shareToken) {
    return <ClientView shareToken={route.shareToken} theme={clientTheme} onThemeChange={changeClientTheme} />
  }

  if (!user && route.type === 'login') return <><Login /><ToastHost /></>
  if (user && (route.type === 'landing' || route.type === 'login')) return <><WorkspaceLoadingSkeleton /><ToastHost /></>
  if (!user && ['dashboard', 'reviews', 'activity', 'profile', 'settings', 'upload', 'project', 'creator-review'].includes(route.type)) return <><LoginLoadingSkeleton /><ToastHost /></>

  if (route.type === 'public-info') {
    if (route.path === '/about') return <><About /><ToastHost /></>
    if (route.path === '/privacy') return <><PrivacyPolicy /><ToastHost /></>
    if (route.path === '/terms') return <><TermsOfService /><ToastHost /></>
    if (route.path === '/acceptable-use') return <><AcceptableUse /><ToastHost /></>
    if (route.path === '/security') return <><SecurityPage /><ToastHost /></>
    if (route.path === '/help') return <><Help /><ToastHost /></>
    return <><Contact /><ToastHost /></>
  }

  if (!user && route.type === 'landing') return <><Landing /><ToastHost /></>

  if (route.type === 'project' || route.type === 'creator-review') {
    if (projectLoading) {
      if (route.type === 'creator-review') return <><WorkspaceLoadingSkeleton /><ToastHost /></>
      return <><WorkspaceShell user={user} activeView="project" onNavigate={navigateView} theme={appTheme} onThemeChange={changeAppTheme}><ProjectHubLoadingSkeleton /></WorkspaceShell><ToastHost /></>
    }
    if (projectError || !selectedProject) {
      return <><WorkspaceShell user={user} activeView={route.type === 'project' ? 'project' : 'reviews'} onNavigate={navigateView} theme={appTheme} onThemeChange={changeAppTheme}><NotFound onHome={backToDashboard} /></WorkspaceShell><ToastHost /></>
    }
    if (route.type === 'creator-review') {
      return <><VideoReview
        project={selectedProject}
        user={user}
        theme={reviewTheme}
        onThemeChange={changeReviewTheme}
        initialVideoId={route.videoId}
        onBack={() => navigateTo(projectPath(selectedProject.id))}
        onProjectChange={updateSelectedProject}
      /><ToastHost /></>
    }
    return <WorkspaceShell user={user} activeView="project" onNavigate={navigateView} theme={appTheme} onThemeChange={changeAppTheme}>
      <ProjectHub
        project={selectedProject}
        onBack={backToDashboard}
        onOpenReview={(videoId = null) => openProject(selectedProject, videoId)}
        onUploadVersion={() => openUpload(selectedProject.id)}
        onProjectChange={updateSelectedProject}
      />
    </WorkspaceShell>
  }

  if (route.type === 'not-found') {
    return <><NotFound onHome={() => navigateTo(user ? APP_PATHS.dashboard : '/')} /><ToastHost /></>
  }

  const activeView = route.type

  return (
    <WorkspaceShell user={user} activeView={activeView} onNavigate={navigateView} theme={appTheme} onThemeChange={changeAppTheme}>
      {activeView === 'dashboard' && <Dashboard user={user} onSelectProject={manageProject} onManageProject={manageProject} onUpload={openUpload} onOpenActivity={() => navigateView('activity')} />}
      {activeView === 'reviews' && <ReviewsPage user={user} onOpenProject={manageProject} />}
      {activeView === 'activity' && <ActivityPage user={user} onOpenProject={manageProject} />}
      {activeView === 'upload' && <Upload user={user} initialProjectId={route.projectId || ''} onUploadSuccess={backToDashboard} onCancel={backToDashboard} />}
      {activeView === 'profile' && <Profile user={user} />}
      {activeView === 'settings' && <SettingsPage user={user} theme={appTheme} onThemeChange={changeAppTheme} reviewTheme={reviewTheme} onReviewThemeChange={changeReviewTheme} onOpenActivity={() => navigateView('activity')} />}
    </WorkspaceShell>
  )
}

export default App
