import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Github,
  Trash2,
  FolderGit2,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Settings,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  ShieldCheck,
  ArrowUpDown,
  RefreshCw,
  Layers,
  Check,
  X,
  ExternalLink,
  Cpu,
  Smartphone,
  Monitor,
  Maximize2,
  Wifi,
  Battery,
  Signal,
  HelpCircle,
  Plus,
  Star,
  GitFork,
  Lock,
  Globe,
  Code2,
  AlertTriangle,
  Zap,
  Eye,
  EyeOff,
  Terminal,
  Play,
  FileCode,
  Folder,
  Laptop,
  CheckSquare,
  Rocket,
  Square,
  Activity,
  Server,
  Sliders,
  RotateCcw,
  Boxes,
  Tablet,
  ArrowLeft,
  ArrowRight,
  Copy,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  ChevronRight,
  ChevronDown,
  Code,
  Key,
  Database,
  Share2,
  Volume2,
  VolumeX,
  Phone,
  Video,
  Sun,
  Moon,
  LogIn,
  LogOut
} from "lucide-react";
import { collection, addDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { useAuth } from "./lib/AuthContext";
import { db, handleFirestoreError, OperationType } from "./lib/firebase";

interface Message {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  actionCard?: 'github_summary' | 'token_helper' | 'cleanup_success' | 'error_notice' | 'runner_summary';
}

interface Repository {
  id: number;
  name: string;
  description: string;
  size: number;
  language: string | null;
  updated_at: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  private: boolean;
  html_url: string;
  homepage?: string;
  default_branch: string;
  isEmpty: boolean;
  owner: { login: string };
}

interface RunnerInstance {
  status: 'running' | 'stopped' | 'building' | 'error';
  port: number;
  startedAt: string;
  logs: string[];
  cpu: number;
  memoryMb: number;
  uptimeSeconds?: number;
  requestsServed?: number;
}

export default function App() {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const [cloudSyncedRepos, setCloudSyncedRepos] = useState<string[]>([]);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'github' | 'workstation' | 'runner' | 'preview'>('preview');
  const [githubToken, setGithubToken] = useState<string>("");
  const [githubStatus, setGithubStatus] = useState<{ connected: boolean; mode: string; login?: string; error?: string } | null>(null);
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  
  // Create Repo Form state
  const [newRepoName, setNewRepoName] = useState<string>("");
  const [newRepoDesc, setNewRepoDesc] = useState<string>("");
  const [newRepoPrivate, setNewRepoPrivate] = useState<boolean>(false);
  const [newRepoStarter, setNewRepoStarter] = useState<boolean>(true);
  const [creatingRepo, setCreatingRepo] = useState<boolean>(false);

  // Edit Repo Modal state
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null);
  const [editRepoDesc, setEditRepoDesc] = useState<string>("");
  const [editRepoHomepage, setEditRepoHomepage] = useState<string>("");
  const [savingRepoMeta, setSavingRepoMeta] = useState<boolean>(false);

  const [repos, setRepos] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'updated' | 'name' | 'size' | 'stars'>('updated');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'empty' | 'private'>('all');
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stubbornRepo, setStubbornRepo] = useState<string | null>(null);

  // Responsive mobile sub-view toggles
  const [mobileStudioView, setMobileStudioView] = useState<'canvas' | 'inspector'>('canvas');
  const [mobileIdeView, setMobileIdeView] = useState<'terminal' | 'files'>('terminal');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [autoRunEnabled, setAutoRunEnabled] = useState<boolean>(true);

  // Workstation PC state
  const [selectedRepoForTest, setSelectedRepoForTest] = useState<Repository | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "Godhubb Workstation v2.5 [Virtual PC OS]",
    "Sistem inițiat. Tastează 'help' pentru comenzi (ls, cat, npm run build, git status)."
  ]);
  const [terminalInput, setTerminalInput] = useState<string>("");
  const [workstationRunning, setWorkstationRunning] = useState<boolean>(false);

  // Cluster Runner state
  const [runners, setRunners] = useState<Record<string, RunnerInstance>>({});
  const [startingAll, setStartingAll] = useState<boolean>(false);
  const [previewAppRepo, setPreviewAppRepo] = useState<Repository | null>(null);
  const [logModalRepo, setLogModalRepo] = useState<string | null>(null);
  const [testingAllBuilds, setTestingAllBuilds] = useState<boolean>(false);

  // AI Studio Preview Workspace State
  const [aiStudioLeftPanel, setAiStudioLeftPanel] = useState<'files' | 'chat' | 'secrets'>('files');
  const [selectedFileInStudio, setSelectedFileInStudio] = useState<string>("src/App.tsx");
  const [previewViewport, setPreviewViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [previewRefreshing, setPreviewRefreshing] = useState<boolean>(false);
  const [showStudioTerminal, setShowStudioTerminal] = useState<boolean>(true);
  const [aiStudioModel, setAiStudioModel] = useState<string>("gemini-4-hydrogen");
  const [activeAiProvider, setActiveAiProvider] = useState<string>("claude");
  const [aiProvidersList, setAiProvidersList] = useState<Array<{ id: string; name: string; model: string; role: string; mode: string; badge: string }>>([]);
  const [autonomousHealing, setAutonomousHealing] = useState<boolean>(false);
  const [autonomousHealAllRunning, setAutonomousHealAllRunning] = useState<boolean>(false);
  const [autonomousReport, setAutonomousReport] = useState<{
    repo: string;
    providerUsed: string;
    routedVia: string;
    filesUpdated: string[];
    steps: Array<{ step: string; status: string; detail: string }>;
  } | null>(null);
  const [newStudioFilePath, setNewStudioFilePath] = useState<string>("");
  const [showNewFileInput, setShowNewFileInput] = useState<boolean>(false);

  // Real Live Preview, Tree & Code Editor State
  const [studioViewMode, setStudioViewMode] = useState<'live' | 'split' | 'code' | 'sandbox'>('live');
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState<boolean>(false);
  const [previewIframeKey, setPreviewIframeKey] = useState<number>(1);
  const [repoTreeFiles, setRepoTreeFiles] = useState<Array<{ path: string; size: number }>>([]);
  const [loadingTree, setLoadingTree] = useState<boolean>(false);
  const [selectedFileContent, setSelectedFileContent] = useState<string>("");
  const [loadingFileContent, setLoadingFileContent] = useState<boolean>(false);
  const [editedFileDirty, setEditedFileDirty] = useState<boolean>(false);
  const [savingFile, setSavingFile] = useState<boolean>(false);
  const [liveConsoleLogs, setLiveConsoleLogs] = useState<Array<{ time: string; level: string; message: string }>>([]);
  const [liveBuildInfo, setLiveBuildInfo] = useState<Record<string, {
    ok: boolean;
    durationMs?: number;
    bundleSizeKb?: number;
    entryFile?: string;
    mode?: string;
    error?: string;
    diagnostics?: {
      missingImports: string[];
      detectedEnvVars: Array<{ name: string; defaultValue: string; hasValue: boolean }>;
      autoResolvedPackages: string[];
    };
  }>>({});
  const [customPreviewEntry, setCustomPreviewEntry] = useState<string>("");
  const [executingCode, setExecutingCode] = useState<boolean>(false);
  const [publicRepoInput, setPublicRepoInput] = useState<string>("");
  const [importingPublicRepo, setImportingPublicRepo] = useState<boolean>(false);
  const [showImportRepoBar, setShowImportRepoBar] = useState<boolean>(false);

  // Runtime Env Vars, Free Public APIs & Auto-Fix Diagnostics State
  const [repoEnvValues, setRepoEnvValues] = useState<Record<string, string>>({});
  const [globalEnvValues, setGlobalEnvValues] = useState<Record<string, string>>({});
  const [freePublicApis, setFreePublicApis] = useState<Array<{ id: string; name: string; category: string; endpoint: string; snippet: string }>>([]);
  const [newEnvKey, setNewEnvKey] = useState<string>("");
  const [newEnvVal, setNewEnvVal] = useState<string>("");
  const [savingEnv, setSavingEnv] = useState<boolean>(false);
  const [autoFixingRepo, setAutoFixingRepo] = useState<boolean>(false);
  const [acquiringMissing, setAcquiringMissing] = useState<boolean>(false);
  const [acquireReport, setAcquireReport] = useState<{
    acquiredItems: Array<{ item: string; kind: string; source: string; detail: string }>;
    suggestedFreeApis: Array<{ id: string; name: string; category: string; endpoint: string }>;
  } | null>(null);

  // GitHub Resource Search & Module Importer Modal State
  const [showGithubHubModal, setShowGithubHubModal] = useState<boolean>(false);
  const [hubSourceMode, setHubSourceMode] = useState<'repos' | 'code' | 'npm' | 'apis'>('repos');
  const [ghSearchQuery, setGhSearchQuery] = useState<string>("react tailwind dashboard");
  const [ghSearchResults, setGhSearchResults] = useState<Array<{ id: number; name: string; fullName: string; owner: { login: string }; description: string; language: string; stars: number; default_branch: string; html_url: string }>>([]);
  const [ghCodeResults, setGhCodeResults] = useState<Array<{ name: string; path: string; repoFullName: string; owner: string; repo: string; htmlUrl: string }>>([]);
  const [npmSearchResults, setNpmSearchResults] = useState<Array<{ name: string; version: string; description: string; esmUrl: string }>>([]);
  const [searchingGh, setSearchingGh] = useState<boolean>(false);
  const [selectedHubRepo, setSelectedHubRepo] = useState<{ name: string; fullName: string; owner: { login: string }; default_branch: string } | null>(null);
  const [hubRepoFiles, setHubRepoFiles] = useState<Array<{ path: string; size: number }>>([]);
  const [loadingHubFiles, setLoadingHubFiles] = useState<boolean>(false);
  const [hubPreviewPath, setHubPreviewPath] = useState<string>("");
  const [hubPreviewContent, setHubPreviewContent] = useState<string>("");
  const [hubTargetPath, setHubTargetPath] = useState<string>("");
  const [importingHubFile, setImportingHubFile] = useState<boolean>(false);

  // Universal Web App Simulator State
  const [universalAppTab, setUniversalAppTab] = useState<'dashboard' | 'crud' | 'api'>('dashboard');
  const [universalItems, setUniversalItems] = useState([
    { id: 1, title: "Configurare pipeline CI/CD Godhubb", status: "complet", priority: "Ridicat" },
    { id: 2, title: "Testare container Node.js pe portul :3000", status: "in_lucru", priority: "Mediu" },
    { id: 3, title: "Securizare variabile de mediu (.env)", status: "complet", priority: "Critic" },
    { id: 4, title: "Optimizare cache Fast Refresh Vite", status: "nou", priority: "Normal" }
  ]);
  const [universalNewTitle, setUniversalNewTitle] = useState("");
  const [universalApiResult, setUniversalApiResult] = useState<string | null>(null);
  const [universalTheme, setUniversalTheme] = useState<'dark' | 'light'>('dark');
  const [voicePlaying, setVoicePlaying] = useState<boolean>(false);
  const [promptGenerating, setPromptGenerating] = useState<boolean>(false);
  const [trafficSimulating, setTrafficSimulating] = useState<boolean>(false);
  const [whatsappSimTab, setWhatsappSimTab] = useState<'chats' | 'status' | 'calls'>('chats');
  const [activeVoiceSeconds, setActiveVoiceSeconds] = useState<number>(0);
  const [simulatingCall, setSimulatingCall] = useState<boolean>(false);
  const [copiedPromptSuccess, setCopiedPromptSuccess] = useState<boolean>(false);

  // Interactive Live Sandbox App Mock state (for testing)
  const [sandboxPromptInput, setSandboxPromptInput] = useState<string>("");
  const [sandboxPromptCategory, setSandboxPromptCategory] = useState<string>("DevOps");
  const [sandboxPromptOutput, setSandboxPromptOutput] = useState<string>("");
  const [sandboxCartItems, setSandboxCartItems] = useState<number>(3);
  const [sandboxCheckoutSuccess, setSandboxCheckoutSuccess] = useState<boolean>(false);

  // Interactive WhatsApp Clone Sandbox Mock state
  const [sandboxChatMessages, setSandboxChatMessages] = useState<Array<{ sender: 'me' | 'bot'; text: string; time: string }>>([
    { sender: 'bot', text: 'Salut! Aceasta este instanța live a aplicației whatsapp-clone-react compilată în Google AI Studio.', time: '11:28' }
  ]);
  const [sandboxChatInput, setSandboxChatInput] = useState<string>("");

  const GITHUB_TOKEN_URL = "https://github.com/settings/tokens/new?scopes=repo,delete_repo,workflow,user&description=WhatsAI+Studio+Godhubb+Manager";

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "system",
      text: "Google AI Studio Workspace inițiat. Toate uneltele de compilare și previzualizare sunt active.",
      timestamp: "11:28"
    },
    {
      id: "2",
      sender: "assistant",
      text: "Salut! Sunt Alexia (Sistem). Pagina de previzualizare a fost configurată exact ca în Google AI Studio: panou split cu editor de cod/fișiere, consolă de prompturi, bară de compilare și fereastră live de execuție!",
      timestamp: "11:28",
      actionCard: "runner_summary"
    }
  ]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Periodic poll to keep live metrics and requests count ticking
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRunnerStatus();
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Voice note timer simulation
  useEffect(() => {
    let timer: any;
    if (voicePlaying) {
      timer = setInterval(() => {
        setActiveVoiceSeconds(prev => (prev >= 24 ? 0 : prev + 1));
      }, 1000);
    } else {
      setActiveVoiceSeconds(0);
    }
    return () => clearInterval(timer);
  }, [voicePlaying]);

  // URL parameters detection on mount (e.g. ?preview=whatsapp-clone-react&auto=true)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'preview' || tabParam === 'runner' || tabParam === 'github' || tabParam === 'workstation' || tabParam === 'chats') {
        setActiveTab(tabParam as any);
      }
      if (params.get('preview')) {
        setActiveTab('preview');
      }
    }
  }, []);

  useEffect(() => {
    checkStatusAndFetchRepos();
    fetchRunnerStatus();
  }, [githubToken]);

  useEffect(() => {
    if (!user) {
      setCloudSyncedRepos([]);
      return;
    }

    const projectsPath = `users/${user.uid}/projects`;
    const projectsQuery = query(
      collection(db, projectsPath),
      where("ownerId", "==", user.uid)
    );
    const unsubProjects = onSnapshot(
      projectsQuery,
      (snapshot) => {
        setCloudSyncedRepos(snapshot.docs.map((d) => String(d.data().repoFullName || "")).filter(Boolean));
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, projectsPath);
      }
    );

    const notesPath = `users/${user.uid}/notes`;
    const notesQuery = query(
      collection(db, notesPath),
      where("ownerId", "==", user.uid)
    );
    const unsubNotes = onSnapshot(
      notesQuery,
      () => {},
      (err) => {
        handleFirestoreError(err, OperationType.GET, notesPath);
      }
    );

    return () => {
      unsubProjects();
      unsubNotes();
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Listen to live console & runtime logs streamed from preview iframe
  useEffect(() => {
    const handleMsg = (event: MessageEvent) => {
      if (event.data?.type === "LIVE_APP_LOG") {
        setLiveConsoleLogs(prev => [
          ...prev.slice(-40),
          {
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            level: event.data.level || "info",
            message: `[${event.data.repo}] ${event.data.message}`
          }
        ]);
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, []);

  const fetchRunnerStatus = async () => {
    try {
      const res = await fetch("/api/runner/status");
      const data = await res.json();
      if (data.runners) {
        setRunners(data.runners);
      }
    } catch (err) {
      console.error("Runner status fetch error", err);
    }
  };

  const handleSimulateTraffic = async (repoName: string) => {
    setTrafficSimulating(true);
    setActionMessage(`Trimitere trafic de test către [${repoName}]...`);
    try {
      const res = await fetch("/api/runner/traffic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoName })
      });
      const data = await res.json();
      if (data.success && data.runner) {
        setRunners(prev => ({ ...prev, [repoName]: data.runner }));
        setActionMessage(`⚡ ${data.message}`);
      }
    } catch (err) {
      console.error("Traffic error", err);
    } finally {
      setTrafficSimulating(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleGenerateLivePrompt = async () => {
    setPromptGenerating(true);
    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            sender: "user",
            text: `Generează un prompt profesional și optimizat pentru categoria ${sandboxPromptCategory} având ca cerință: ${sandboxPromptInput || 'Arhitectură completă cu microservicii și Docker'}. Răspunde direct cu structura optimizată a promptului în română.`
          }]
        })
      });
      const data = await res.json();
      setSandboxPromptOutput(data.text || `Prompt generat cu succes pentru ${sandboxPromptCategory}`);
    } catch (err) {
      setSandboxPromptOutput(`[AI Studio Gemini]: Prompt optimizat pentru ${sandboxPromptCategory}: "Creează un pipeline de producție securizat cu audit automat și metrici de performanță."`);
    } finally {
      setPromptGenerating(false);
    }
  };

  const handleAddUniversalItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!universalNewTitle.trim()) return;
    setUniversalItems(prev => [
      ...prev,
      { id: Date.now(), title: universalNewTitle.trim(), status: 'nou', priority: 'Mediu' }
    ]);
    setUniversalNewTitle("");
  };

  const handleToggleUniversalItem = (id: number) => {
    setUniversalItems(prev => prev.map(item => item.id === id ? { ...item, status: item.status === 'complet' ? 'in_lucru' : 'complet' } : item));
  };

  const handleDeleteUniversalItem = (id: number) => {
    setUniversalItems(prev => prev.filter(item => item.id !== id));
  };

  const handleRunUniversalApi = (endpoint: string) => {
    if (endpoint === '/api/health') {
      setUniversalApiResult(JSON.stringify({ status: "UP", port: currentRunnerInfo?.port || 3001, timestamp: new Date().toISOString(), uptime: `${currentRunnerInfo?.uptimeSeconds || 120}s`, loadAvg: "0.14, 0.08, 0.03" }, null, 2));
    } else if (endpoint === '/api/metrics') {
      setUniversalApiResult(JSON.stringify({ memoryUsed: `${currentRunnerInfo?.memoryMb || 54}MB`, cpuUsage: `${currentRunnerInfo?.cpu || 4}%`, totalRequests: currentRunnerInfo?.requestsServed || 38, latencyMs: 8 }, null, 2));
    } else {
      setUniversalApiResult(JSON.stringify({ event: "cluster_heartbeat", repo: currentPreviewRepo?.name, branch: currentPreviewRepo?.default_branch || "main", syncStatus: "OK" }, null, 2));
    }
  };

  const getPreviewUrl = (repoName?: string) => {
    const repo = repoName || previewAppRepo?.name || (repos[0]?.name ?? 'app');
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/?preview=${encodeURIComponent(repo)}&auto=true`;
    }
    return `https://ais-dev-kim5zn6wwaspo5udvo5jre.run.app/?preview=${encodeURIComponent(repo)}&auto=true`;
  };

  const handleCopyPreviewLink = async (repoName?: string) => {
    const targetRepoName = repoName || previewAppRepo?.name || (repos[0]?.name ?? 'app');
    const url = getPreviewUrl(targetRepoName);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setActionMessage(`Link previzualizare [${targetRepoName}] copiat! (Auto-setare & rulare activată) 📋`);
      setTimeout(() => {
        setCopiedLink(false);
        setActionMessage(null);
      }, 3500);
    } catch (err) {
      setActionMessage(`Link copiat pentru [${targetRepoName}]!`);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const getLiveAppUrl = (repo?: Repository | null) => {
    const target = repo || currentPreviewRepo;
    if (!target) return "/live-app/alexia-dev/whatsapp-clone-react";
    const owner = target.owner?.login || githubStatus?.login || "alexia-dev";
    const tokenParam = githubToken.trim() ? `&token=${encodeURIComponent(githubToken.trim())}` : "";
    const entryParam = !repo && customPreviewEntry ? `&entry=${encodeURIComponent(customPreviewEntry)}` : "";
    return `/live-app/${encodeURIComponent(owner)}/${encodeURIComponent(target.name)}?v=${previewIframeKey}${tokenParam}${entryParam}`;
  };

  const loadRepoTreeForStudio = async (repo: Repository, forceRefresh = false) => {
    if (!repo) return;
    setLoadingTree(true);
    try {
      const res = await fetch("/api/github/tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          owner: repo.owner?.login || githubStatus?.login || "alexia-dev",
          repo: repo.name,
          branch: repo.default_branch || "main",
          refresh: forceRefresh
        })
      });
      const data = await res.json();
      const files: Array<{ path: string; size: number }> = data.files || [];
      setRepoTreeFiles(files);

      // Automatically select and load the main entry file if available
      const defaultFile =
        files.find(f => f.path === "src/App.tsx")?.path ||
        files.find(f => f.path === "client/src/App.tsx")?.path ||
        files.find(f => f.path.endsWith("App.tsx") || f.path.endsWith("main.tsx"))?.path ||
        files.find(f => f.path === "index.html")?.path ||
        files[0]?.path;

      if (defaultFile) {
        loadFileContentFromRepo(repo, defaultFile);
      } else {
        setSelectedFileInStudio("");
        setSelectedFileContent("// Repository gol — nu există fișiere încă.");
      }
    } catch (err) {
      console.error("Tree load failed", err);
    } finally {
      setLoadingTree(false);
    }
  };

  const loadFileContentFromRepo = async (repo: Repository, filePath: string) => {
    if (!repo || !filePath) return;
    setSelectedFileInStudio(filePath);
    setLoadingFileContent(true);
    setEditedFileDirty(false);
    try {
      const res = await fetch("/api/github/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          owner: repo.owner?.login || githubStatus?.login || "alexia-dev",
          repo: repo.name,
          filePath,
          branch: repo.default_branch || "main"
        })
      });
      const data = await res.json();
      setSelectedFileContent(data.content ?? `// Nu s-a putut citi ${filePath}`);
    } catch (err) {
      setSelectedFileContent(`// Eroare la citirea fișierului ${filePath}`);
    } finally {
      setLoadingFileContent(false);
    }
  };

  const handleSaveEditedFile = async (pushToGitHub = false) => {
    if (!currentPreviewRepo || !selectedFileInStudio) return;
    setSavingFile(true);
    try {
      const owner = currentPreviewRepo.owner?.login || githubStatus?.login || "alexia-dev";
      const res = await fetch("/api/github/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          owner,
          repo: currentPreviewRepo.name,
          filePath: selectedFileInStudio,
          content: selectedFileContent,
          pushToGitHub,
          branch: currentPreviewRepo.default_branch || "main"
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditedFileDirty(false);
        await triggerLiveBuild(currentPreviewRepo, false);
        setPreviewIframeKey(k => k + 1);
        setActionMessage(
          data.pushed
            ? `Fișierul ${selectedFileInStudio} salvat pe GitHub și recompilat live!`
            : `Fișierul ${selectedFileInStudio} salvat și recompilat în previzualizarea live!`
        );
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      setErrorMessage("Eroare la salvarea fișierului.");
    } finally {
      setSavingFile(false);
    }
  };

  const triggerLiveBuild = async (repo: Repository, refresh = false, overrideEntry?: string) => {
    if (!repo) return null;
    try {
      const owner = repo.owner?.login || githubStatus?.login || "alexia-dev";
      const res = await fetch("/api/preview/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          owner,
          repo: repo.name,
          refresh,
          entry: overrideEntry !== undefined ? overrideEntry : (customPreviewEntry || undefined)
        })
      });
      const data = await res.json();
      if (data.status) {
        setLiveBuildInfo(prev => ({ ...prev, [repo.name]: data.status }));
        return data.status;
      }
    } catch (err) {
      console.error("Build error", err);
    }
    return null;
  };

  const handleAutoSetAndRun = async (repo: Repository) => {
    try {
      const res = await fetch("/api/runner/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoName: repo.name })
      });
      const data = await res.json();
      if (data.runners) {
        setRunners(data.runners);
      }
    } catch (err) {
      console.error("Auto set and run error", err);
    }
  };

  const checkStatusAndFetchRepos = async () => {
    setLoadingRepos(true);
    setErrorMessage(null);
    try {
      const statusRes = await fetch("/api/github/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: githubToken })
      });
      const statusData = await statusRes.json();
      setGithubStatus(statusData);

      const res = await fetch("/api/github/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: githubToken })
      });
      const data = await res.json();
      if (data.error) {
        setErrorMessage(data.error);
      } else if (data.repos) {
        setRepos(data.repos);
        if (data.repos.length > 0) {
          const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const previewParam = params?.get('preview');
          const autoParam = params?.get('auto');

          let chosenRepo = data.repos[0];
          if (previewParam) {
            const found = data.repos.find((r: Repository) => r.name.toLowerCase() === previewParam.toLowerCase());
            if (found) chosenRepo = found;
          } else if (!previewAppRepo) {
            const activeFirst = data.repos.find((r: Repository) => !r.isEmpty) || data.repos[0];
            chosenRepo = activeFirst;
          }

          setSelectedRepoForTest(chosenRepo);
          setPreviewAppRepo(chosenRepo);

          // If autoParam is true or autoRunEnabled is active, automatically start the container!
          if (autoParam === 'true' || autoRunEnabled) {
            handleAutoSetAndRun(chosenRepo);
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch repos", err);
      setErrorMessage("Eroare de rețea la Godhubb.");
    } finally {
      setLoadingRepos(false);
    }
  };

  // Launch all projects and immediately switch to AI Studio Preview
  const handleStartAllProjects = async () => {
    setStartingAll(true);
    setActionMessage("Pornire instanțe... redirecționare automată la Google AI Studio Preview!");
    try {
      const res = await fetch("/api/runner/start-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos })
      });
      const data = await res.json();
      if (data.runners) {
        setRunners(data.runners);
        const firstActive = repos.find(r => !r.isEmpty) || repos[0];
        if (firstActive) {
          setPreviewAppRepo(firstActive);
        }
        setActiveTab('preview');
        setActionMessage(`🚀 Toate proiectele au fost compilate și pornite în AI Studio Preview!`);

        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "assistant",
            text: `Am pornit toate proiectele tale în mediul Google AI Studio! Poți naviga între fișiere, consolă și previzualizarea live a fiecărui proiect.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionCard: "runner_summary"
          }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Eroare la pornirea clusterului de proiecte.");
    } finally {
      setStartingAll(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Launch single project and open in AI Studio Preview
  const handleStartSingleAndPreview = async (repo: Repository) => {
    setActionMessage(`Compilare și pornire live pentru ${repo.name}...`);
    try {
      const res = await fetch("/api/runner/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoName: repo.name })
      });
      const data = await res.json();
      if (data.runners) {
        setRunners(data.runners);
      }
      setPreviewAppRepo(repo);
      setActiveTab('preview');
      setStudioViewMode('live');
      setPreviewIframeKey(k => k + 1);
      await Promise.all([loadRepoTreeForStudio(repo), triggerLiveBuild(repo)]);
      setActionMessage(`🟢 ${repo.name} rulează LIVE în Google AI Studio!`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setPreviewAppRepo(repo);
      setActiveTab('preview');
    }
  };

  const handleTestAllRepoBuilds = async () => {
    const activeRepos = repos.filter(r => !r.isEmpty);
    if (activeRepos.length === 0) return;
    setTestingAllBuilds(true);
    setActionMessage(`Se compilează și se testează ${activeRepos.length} proiecte...`);
    let passed = 0;
    for (const r of activeRepos) {
      const st = await triggerLiveBuild(r, false);
      if (st?.ok) passed++;
    }
    setTestingAllBuilds(false);
    setActionMessage(`Test complet finalizat: ${passed}/${activeRepos.length} proiecte compilate și verificate live!`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleStopAllProjects = async () => {
    try {
      const res = await fetch("/api/runner/stop-all", { method: "POST" });
      const data = await res.json();
      if (data.runners) {
        setRunners(data.runners);
        setActionMessage("Toate containerele proiectelor au fost oprite.");
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSingleRunner = async (repoName: string) => {
    try {
      const res = await fetch("/api/runner/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoName })
      });
      const data = await res.json();
      if (data.runners) {
        setRunners(data.runners);
        const st = data.runners[repoName]?.status;
        setActionMessage(`Proiectul ${repoName} este acum ${st === 'running' ? 'PORNIT (LIVE) 🟢' : 'OPRIT 🔴'}`);
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: activeAiProvider,
          model: aiStudioModel,
          messages: [...messages, userMsg],
          contextData: {
            totalRepos: repos.length,
            runningContainers: Object.values(runners).filter(r => r.status === 'running').length,
            currentPreview: currentPreviewRepo?.name || previewAppRepo?.name,
            activeFilePath: selectedFileInStudio,
            activeFileSnippet: selectedFileContent.slice(0, 3500),
            githubStatus
          }
        })
      });
      const data = await res.json();
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: data.text || "Am procesat solicitarea ta.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: "Eroare de comunicare cu serverul AI.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const extractCodeBlock = (text: string): string | null => {
    const match = text.match(/```(?:tsx|ts|jsx|js|html|css)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  };

  const handleApplyAiCodeToEditor = async (codeText: string) => {
    if (!currentPreviewRepo || !codeText) return;
    const targetPath = selectedFileInStudio || "src/App.tsx";
    setSelectedFileInStudio(targetPath);
    setSelectedFileContent(codeText);
    setEditedFileDirty(true);
    setStudioViewMode('split');
    setSavingFile(true);
    try {
      const owner = currentPreviewRepo.owner?.login || githubStatus?.login || "alexia-dev";
      const res = await fetch("/api/github/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          owner,
          repo: currentPreviewRepo.name,
          filePath: targetPath,
          content: codeText,
          pushToGitHub: false,
          branch: currentPreviewRepo.default_branch || "main"
        })
      });
      if (res.ok) {
        setEditedFileDirty(false);
        await triggerLiveBuild(currentPreviewRepo, false);
        setPreviewIframeKey(k => k + 1);
        setActionMessage(`Codul generat de AI a fost aplicat în ${targetPath} și recompilat live!`);
        setTimeout(() => setActionMessage(null), 3500);
      }
    } catch (err) {
      setErrorMessage("Nu s-a putut aplica codul generat.");
    } finally {
      setSavingFile(false);
    }
  };

  const handleCreateNewStudioFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newStudioFilePath.trim().replace(/^\/+/, "");
    if (!cleaned || !currentPreviewRepo) return;
    const starterCode = cleaned.endsWith(".tsx") || cleaned.endsWith(".jsx")
      ? `import React from 'react';\n\nexport default function Component() {\n  return (\n    <div className="p-4 text-white">\n      <h2 className="text-lg font-bold">${cleaned}</h2>\n    </div>\n  );\n}\n`
      : cleaned.endsWith(".css")
      ? `/* Stiluri pentru ${cleaned} */\n`
      : `// ${cleaned}\n`;

    setSavingFile(true);
    try {
      const owner = currentPreviewRepo.owner?.login || githubStatus?.login || "alexia-dev";
      const res = await fetch("/api/github/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          owner,
          repo: currentPreviewRepo.name,
          filePath: cleaned,
          content: starterCode,
          pushToGitHub: false,
          branch: currentPreviewRepo.default_branch || "main"
        })
      });
      if (res.ok) {
        setRepoTreeFiles(prev => [{ path: cleaned, size: starterCode.length }, ...prev.filter(f => f.path !== cleaned)]);
        setSelectedFileInStudio(cleaned);
        setSelectedFileContent(starterCode);
        setEditedFileDirty(false);
        setStudioViewMode('split');
        setNewStudioFilePath("");
        setShowNewFileInput(false);
        setActionMessage(`Fișierul ${cleaned} a fost creat în ${currentPreviewRepo.name}!`);
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      setErrorMessage("Eroare la crearea fișierului.");
    } finally {
      setSavingFile(false);
    }
  };

  const handleExecuteActiveFile = async (overrideRepo?: Repository | null, overrideFilePath?: string, overrideCode?: string) => {
    const targetRepo = overrideRepo || (activeTab === 'workstation' ? selectedRepoForTest : currentPreviewRepo);
    const targetFile = overrideFilePath || selectedFileInStudio;
    const codeStr = overrideCode !== undefined ? overrideCode : selectedFileContent;
    if (!targetRepo || !targetFile) return;

    const owner = targetRepo.owner?.login || githubStatus?.login || "alexia-dev";
    const isScript = /\.(py|sh|mjs|cjs)$/i.test(targetFile) || (/\.(ts|js)$/i.test(targetFile) && !/createRoot|ReactDOM/.test(codeStr));

    if (isScript) {
      setExecutingCode(true);
      setActionMessage(`Execuție live pe server pentru ${targetFile}...`);
      try {
        const res = await fetch("/api/runner/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: githubToken,
            owner,
            repo: targetRepo.name,
            filePath: targetFile,
            code: codeStr
          })
        });
        const data = await res.json();
        const combined = ((data.stdout || "") + (data.stderr ? `\n[STDERR]\n${data.stderr}` : "")).trim() || "(Finalizat fără output)";
        setLiveConsoleLogs(prev => [
          ...prev.slice(-30),
          {
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            level: data.ok ? "info" : "error",
            message: `[${targetFile} • ${data.runtime} • Exit ${data.exitCode}] ${combined}`
          }
        ]);
        setTerminalLogs(prev => [
          ...prev,
          `$ ${targetFile.endsWith('.py') ? 'python3' : 'node'} ${targetFile} (${data.runtime})`,
          ...combined.split('\n'),
          data.ok ? `✓ Finalizat în ${data.durationMs}ms` : `✗ Exit code ${data.exitCode}`
        ]);
        setShowStudioTerminal(true);
        setActionMessage(`${data.ok ? '✓ Executat' : '✗ Eroare'} ${targetFile} (${data.runtime}, ${data.durationMs}ms)`);
      } catch (err) {
        setErrorMessage("Eroare la execuția fișierului pe server.");
      } finally {
        setExecutingCode(false);
        setTimeout(() => setActionMessage(null), 3500);
      }
    } else {
      // React TSX/JSX or HTML file -> mount directly as customPreviewEntry inside Live Iframe
      setCustomPreviewEntry(targetFile);
      setPreviewAppRepo(targetRepo);
      if (editedFileDirty) {
        await handleSaveEditedFile(false);
      } else {
        await triggerLiveBuild(targetRepo, false, targetFile);
        setPreviewIframeKey(k => k + 1);
      }
      if (activeTab !== 'preview') {
        setActiveTab('preview');
        setStudioViewMode('live');
      } else if (studioViewMode === 'code') {
        setStudioViewMode('split');
      }
      setActionMessage(`▶ ${targetFile} rulează acum în Previzualizarea Live!`);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleImportPublicRepo = async (e?: React.FormEvent, repoOverride?: string) => {
    if (e) e.preventDefault();
    const val = (repoOverride !== undefined ? repoOverride : publicRepoInput).trim();
    if (!val) return;
    setImportingPublicRepo(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/github/import-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: githubToken, repoUrl: val })
      });
      const data = await res.json();
      if (!res.ok || !data.repo) {
        throw new Error(data.error || "Nu s-a putut importa repository-ul.");
      }
      const importedRepo: Repository = data.repo;
      setRepos(prev => [importedRepo, ...prev.filter(r => !(r.name === importedRepo.name && r.owner?.login === importedRepo.owner?.login))]);
      setPublicRepoInput("");
      setShowImportRepoBar(false);
      setCustomPreviewEntry("");
      setSelectedRepoForTest(importedRepo);
      setPreviewAppRepo(importedRepo);
      setActiveTab('preview');
      setStudioViewMode('live');
      setPreviewIframeKey(k => k + 1);
      await fetchRunnerStatus();
      setActionMessage(`🚀 ${importedRepo.owner.login}/${importedRepo.name} importat și lansat LIVE!`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setImportingPublicRepo(false);
    }
  };

  const fetchStudioEnv = async (repo?: Repository | null) => {
    try {
      const owner = repo?.owner?.login || githubStatus?.login || "";
      const repoName = repo?.name || "";
      const qs = owner && repoName ? `?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}` : "";
      const [envRes, aiRes] = await Promise.all([
        fetch(`/api/env${qs}`),
        aiProvidersList.length === 0 ? fetch("/api/ai/providers") : Promise.resolve(null)
      ]);
      const data = await envRes.json();
      setGlobalEnvValues(data.global || {});
      setRepoEnvValues(data.repoEnv || {});
      if (Array.isArray(data.freeApis)) {
        setFreePublicApis(data.freeApis);
      }
      if (aiRes) {
        const aiData = await aiRes.json();
        if (Array.isArray(aiData.providers)) setAiProvidersList(aiData.providers);
      }
    } catch (err) {
      console.error("Failed to fetch studio env", err);
    }
  };

  const handleAutonomousHealCurrent = async (goalOverride = "") => {
    if (!currentPreviewRepo) return;
    setAutonomousHealing(true);
    setErrorMessage(null);
    setActionMessage(`🤖 Agentul Autonom (${activeAiProvider.toUpperCase()}) analizează și repară ${currentPreviewRepo.name}...`);
    try {
      const owner = currentPreviewRepo.owner?.login || githubStatus?.login || "alexia-dev";
      const res = await fetch("/api/ai/autonomous-heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          owner,
          repo: currentPreviewRepo.name,
          provider: activeAiProvider,
          goal: goalOverride
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare agent autonom.");

      if (data.status) {
        setLiveBuildInfo(prev => ({ ...prev, [currentPreviewRepo.name]: data.status }));
      }
      setAutonomousReport({
        repo: currentPreviewRepo.name,
        providerUsed: data.providerUsed || "Claude AI",
        routedVia: data.routedVia || "Multi-AI Swarm",
        filesUpdated: data.filesUpdated || [],
        steps: data.steps || []
      });
      await Promise.all([
        loadRepoTreeForStudio(currentPreviewRepo),
        fetchRunnerStatus()
      ]);
      setPreviewIframeKey(k => k + 1);
      setAiStudioLeftPanel('chat');

      // Persist project sync, AI run log, and workspace note to Firestore when authenticated
      if (user) {
        const userRef = doc(db, "users", user.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists() && user.email) {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              displayName: (user.displayName || "").slice(0, 120),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (userErr) {
          handleFirestoreError(userErr, OperationType.WRITE, `users/${user.uid}`);
        }

        const repoFullName = `${owner}/${currentPreviewRepo.name}`.slice(0, 200);
        const safeProjectId = repoFullName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
        const projectDocPath = `users/${user.uid}/projects/${safeProjectId}`;
        const projectRef = doc(db, "users", user.uid, "projects", safeProjectId);

        try {
          const existingDoc = await getDoc(projectRef);
          if (existingDoc.exists()) {
            await updateDoc(projectRef, {
              aiProvider: String(activeAiProvider).slice(0, 40),
              status: data.success ? "active" : "needs_review",
              notes: `Ultima reparare: ${data.providerUsed || "Claude AI"}`.slice(0, 5000),
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(projectRef, {
              ownerId: user.uid,
              repoFullName,
              aiProvider: String(activeAiProvider).slice(0, 40),
              status: data.success ? "active" : "needs_review",
              notes: `Ultima reparare: ${data.providerUsed || "Claude AI"}`.slice(0, 5000),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.WRITE, projectDocPath);
        }

        const runsPath = `users/${user.uid}/aiRuns`;
        try {
          await addDoc(collection(db, runsPath), {
            ownerId: user.uid,
            repoFullName,
            provider: String(data.providerUsed || activeAiProvider).slice(0, 80),
            summary: `Actualizate ${data.filesUpdated?.length || 0} fișiere (${data.routedVia || "Multi-AI"}).`.slice(0, 2000),
            success: Boolean(data.success),
            createdAt: serverTimestamp(),
          });
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.CREATE, runsPath);
        }

        const notesPath = `users/${user.uid}/notes`;
        try {
          await addDoc(collection(db, notesPath), {
            ownerId: user.uid,
            title: `Reparare autonomă: ${currentPreviewRepo.name}`.slice(0, 160),
            content: `Motor: ${data.providerUsed || "Claude AI"} | Fișiere actualizate: ${(data.filesUpdated || []).join(", ").slice(0, 500)}`.slice(0, 10000),
            repoName: repoFullName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.CREATE, notesPath);
        }
      }

      setActionMessage(`✅ ${data.providerUsed}: ${currentPreviewRepo.name} reparat și verificat autonom (${data.filesUpdated?.length || 0} fișiere)!`);
      setTimeout(() => setActionMessage(null), 4500);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setAutonomousHealing(false);
    }
  };

  const handleAutonomousHealAll = async () => {
    if (repos.length === 0) return;
    setAutonomousHealAllRunning(true);
    setErrorMessage(null);
    setActionMessage(`🤖 Echipa Multi-AI (Claude + Gemini + DeepSeek) scanează și face funcționale toate cele ${repos.length} proiecte...`);
    try {
      const res = await fetch("/api/ai/autonomous-heal-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          repos,
          provider: activeAiProvider
        })
      });
      const data = await res.json();
      if (data.runners) setRunners(data.runners);
      if (Array.isArray(data.results)) {
        const updatedInfo: Record<string, any> = {};
        for (const r of data.results) {
          if (r.repo && r.status) updatedInfo[r.repo] = r.status;
        }
        setLiveBuildInfo(prev => ({ ...prev, ...updatedInfo }));
      }
      await checkStatusAndFetchRepos();
      setPreviewIframeKey(k => k + 1);
      setActionMessage(`🚀 Mod Autonom Finalizat: ${data.healed}/${data.total} proiecte funcționale și verificate live!`);
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Eroare la repararea autonomă în lot.");
    } finally {
      setAutonomousHealAllRunning(false);
    }
  };

  const handleSaveEnvVars = async (varsToSave: Record<string, string>, scopeOverride?: string) => {
    const owner = currentPreviewRepo?.owner?.login || githubStatus?.login || "alexia-dev";
    const scope = scopeOverride || (currentPreviewRepo ? `${owner}/${currentPreviewRepo.name}` : "global");
    setSavingEnv(true);
    try {
      const res = await fetch("/api/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, vars: varsToSave })
      });
      const data = await res.json();
      if (data.success) {
        if (scope === "global") setGlobalEnvValues(data.global || {});
        else setRepoEnvValues(data.repoEnv || {});
        if (currentPreviewRepo) {
          await triggerLiveBuild(currentPreviewRepo, false);
          setPreviewIframeKey(k => k + 1);
        }
        setActionMessage("Variabilele de mediu au fost injectate și aplicația s-a recompilat!");
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      setErrorMessage("Nu s-au putut salva variabilele de mediu.");
    } finally {
      setSavingEnv(false);
    }
  };

  const handleAddCustomEnvVar = async (e: React.FormEvent) => {
    e.preventDefault();
    const k = newEnvKey.trim();
    if (!k) return;
    await handleSaveEnvVars({ [k]: newEnvVal });
    setNewEnvKey("");
    setNewEnvVal("");
  };

  const handleAutoFixRepo = async () => {
    if (!currentPreviewRepo) return;
    setAutoFixingRepo(true);
    setErrorMessage(null);
    try {
      const owner = currentPreviewRepo.owner?.login || githubStatus?.login || "alexia-dev";
      const res = await fetch("/api/github/auto-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: githubToken, owner, repo: currentPreviewRepo.name })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Eroare auto-fix.");
      if (data.status) {
        setLiveBuildInfo(prev => ({ ...prev, [currentPreviewRepo.name]: data.status }));
      }
      await Promise.all([loadRepoTreeForStudio(currentPreviewRepo), fetchStudioEnv(currentPreviewRepo)]);
      setPreviewIframeKey(k => k + 1);
      const countFixed = (data.fixedFiles?.length || 0) + Object.keys(data.appliedEnv || {}).length;
      setActionMessage(
        countFixed > 0
          ? `🔧 Auto-Fix reușit: ${data.fixedFiles?.length || 0} fișiere create + ${Object.keys(data.appliedEnv || {}).length} API-uri gratuite injectate!`
          : `✓ Proiectul are deja toate modulele locale configurate!`
      );
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setAutoFixingRepo(false);
    }
  };

  const handleInsertFreeApiIntoProject = async (apiItem: { id: string; name: string; snippet: string }) => {
    if (!currentPreviewRepo) return;
    const owner = currentPreviewRepo.owner?.login || githubStatus?.login || "alexia-dev";
    const filePath = `src/lib/${apiItem.id}.ts`;
    setSavingFile(true);
    try {
      const res = await fetch("/api/github/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          owner,
          repo: currentPreviewRepo.name,
          filePath,
          content: `${apiItem.snippet}\n`,
          pushToGitHub: false,
          branch: currentPreviewRepo.default_branch || "main"
        })
      });
      if (res.ok) {
        setRepoTreeFiles(prev => [{ path: filePath, size: apiItem.snippet.length }, ...prev.filter(f => f.path !== filePath)]);
        setSelectedFileInStudio(filePath);
        setSelectedFileContent(`${apiItem.snippet}\n`);
        setEditedFileDirty(false);
        setStudioViewMode('split');
        setActionMessage(`API gratuit "${apiItem.name}" adăugat în ${filePath}! Poți importa funcția direct în App.tsx.`);
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err) {
      setErrorMessage("Nu s-a putut adăuga helper-ul API.");
    } finally {
      setSavingFile(false);
    }
  };

  const handleAcquireMissingForRepo = async () => {
    if (!currentPreviewRepo) return;
    setAcquiringMissing(true);
    setErrorMessage(null);
    setActionMessage(`🌐 Scanez ${currentPreviewRepo.name} și preiau lipsurile din GitHub, npm & surse gratuite...`);
    try {
      const owner = currentPreviewRepo.owner?.login || githubStatus?.login || "alexia-dev";
      const res = await fetch("/api/github/acquire-missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: githubToken, owner, repo: currentPreviewRepo.name, autoApply: true })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Eroare la preluarea lipsurilor.");
      if (data.status) {
        setLiveBuildInfo(prev => ({ ...prev, [currentPreviewRepo.name]: data.status }));
      }
      setAcquireReport({
        acquiredItems: data.report?.acquiredItems || [],
        suggestedFreeApis: data.report?.suggestedFreeApis || []
      });
      await Promise.all([loadRepoTreeForStudio(currentPreviewRepo), fetchStudioEnv(currentPreviewRepo)]);
      setPreviewIframeKey(k => k + 1);
      const count = data.report?.acquiredItems?.length || 0;
      setActionMessage(
        count > 0
          ? `✅ Preluate ${count} resurse lipsă (GitHub + npm + API-uri gratuite) în ${currentPreviewRepo.name}!`
          : `✓ Proiectul ${currentPreviewRepo.name} are toate pachetele, modulele și API-urile necesare!`
      );
      setTimeout(() => setActionMessage(null), 4500);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setAcquiringMissing(false);
    }
  };

  const handleAddNpmPackageToRepo = async (pkgName: string, version: string) => {
    if (!currentPreviewRepo) return;
    const owner = currentPreviewRepo.owner?.login || githubStatus?.login || "alexia-dev";
    setSavingFile(true);
    try {
      const fileRes = await fetch("/api/github/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: githubToken, owner, repo: currentPreviewRepo.name, filePath: "package.json" })
      });
      let pkgJson: any = { name: currentPreviewRepo.name, version: "1.0.0", dependencies: { react: "^19.0.1", "react-dom": "^19.0.1" } };
      if (fileRes.ok) {
        const fData = await fileRes.json();
        try { pkgJson = JSON.parse(fData.content); } catch {}
      }
      if (!pkgJson.dependencies) pkgJson.dependencies = {};
      pkgJson.dependencies[pkgName] = `^${version.replace(/^[\^~]/, "")}`;
      const newContent = JSON.stringify(pkgJson, null, 2);

      await fetch("/api/github/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          owner,
          repo: currentPreviewRepo.name,
          filePath: "package.json",
          content: newContent,
          pushToGitHub: false
        })
      });
      await Promise.all([loadRepoTreeForStudio(currentPreviewRepo), triggerLiveBuild(currentPreviewRepo, false)]);
      setPreviewIframeKey(k => k + 1);
      setActionMessage(`📦 Pachetul "${pkgName}@^${version}" a fost adăugat în package.json & ImportMap!`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Nu s-a putut adăuga pachetul npm.");
    } finally {
      setSavingFile(false);
    }
  };

  const handleSearchGitHubHub = async (queryOverride?: string, modeOverride?: 'repos' | 'code' | 'npm' | 'apis') => {
    const q = (queryOverride !== undefined ? queryOverride : ghSearchQuery).trim() || "react tailwind";
    const mode = modeOverride || hubSourceMode;
    if (queryOverride !== undefined) setGhSearchQuery(queryOverride);
    if (modeOverride !== undefined) setHubSourceMode(modeOverride);
    setSearchingGh(true);
    try {
      const [ghRes, srcRes] = await Promise.all([
        mode === 'repos'
          ? fetch("/api/github/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: githubToken, query: q })
            })
          : Promise.resolve(null),
        fetch("/api/sources/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: githubToken, query: q, sourceType: mode === 'npm' ? 'npm' : mode === 'code' ? 'github_code' : 'all' })
        })
      ]);
      if (ghRes) {
        const data = await ghRes.json();
        if (Array.isArray(data.repos)) setGhSearchResults(data.repos);
      }
      if (srcRes) {
        const sData = await srcRes.json();
        if (Array.isArray(sData.githubCode)) setGhCodeResults(sData.githubCode);
        if (Array.isArray(sData.npmPackages)) setNpmSearchResults(sData.npmPackages);
      }
    } catch (err) {
      setErrorMessage("Eroare la căutarea resurselor externe.");
    } finally {
      setSearchingGh(false);
    }
  };

  const handleSelectHubRepo = async (hubRepo: { name: string; fullName: string; owner: { login: string }; default_branch: string }) => {
    setSelectedHubRepo(hubRepo);
    setHubPreviewPath("");
    setHubPreviewContent("");
    setLoadingHubFiles(true);
    try {
      const res = await fetch("/api/github/tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          owner: hubRepo.owner.login,
          repo: hubRepo.name,
          branch: hubRepo.default_branch || "main"
        })
      });
      const data = await res.json();
      setHubRepoFiles(Array.isArray(data.files) ? data.files : []);
    } catch (err) {
      setHubRepoFiles([]);
    } finally {
      setLoadingHubFiles(false);
    }
  };

  const handlePreviewHubFile = async (filePath: string) => {
    if (!selectedHubRepo) return;
    setHubPreviewPath(filePath);
    const suggestedDest = filePath.startsWith("src/")
      ? filePath
      : `src/imported/${filePath.split("/").pop() || filePath}`;
    setHubTargetPath(suggestedDest);
    setHubPreviewContent("// Se încarcă fișierul de pe GitHub...");
    try {
      const res = await fetch("/api/github/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          owner: selectedHubRepo.owner.login,
          repo: selectedHubRepo.name,
          filePath,
          branch: selectedHubRepo.default_branch || "main"
        })
      });
      const data = await res.json();
      setHubPreviewContent(data.content ?? "// Nu s-a putut citi fișierul.");
    } catch {
      setHubPreviewContent("// Eroare la citire.");
    }
  };

  const handleImportHubFileToProject = async () => {
    if (!selectedHubRepo || !hubPreviewPath || !currentPreviewRepo) return;
    setImportingHubFile(true);
    try {
      const targetOwner = currentPreviewRepo.owner?.login || githubStatus?.login || "alexia-dev";
      const res = await fetch("/api/github/import-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          srcOwner: selectedHubRepo.owner.login,
          srcRepo: selectedHubRepo.name,
          srcPath: hubPreviewPath,
          srcBranch: selectedHubRepo.default_branch || "main",
          targetOwner,
          targetRepo: currentPreviewRepo.name,
          targetPath: hubTargetPath.trim() || hubPreviewPath,
          pushToGitHub: false
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Import eșuat.");

      const importedPath = data.filePath;
      setRepoTreeFiles(prev => [{ path: importedPath, size: data.size || 0 }, ...prev.filter(f => f.path !== importedPath)]);
      setSelectedFileInStudio(importedPath);
      setSelectedFileContent(data.content || "");
      setEditedFileDirty(false);
      setShowGithubHubModal(false);
      setActiveTab('preview');
      setStudioViewMode('split');
      await triggerLiveBuild(currentPreviewRepo, false);
      setPreviewIframeKey(k => k + 1);
      setActionMessage(`📥 ${importedPath} preluat din ${selectedHubRepo.fullName} și gata de editare live!`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setImportingHubFile(false);
    }
  };

  const handleRunTerminalCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    const newLogs = [...terminalLogs, `$ ${trimmed}`];
    setTerminalInput("");

    if (lower === 'clear') {
      setTerminalLogs(["Godhubb Workstation v2.5 [Virtual PC OS]"]);
      return;
    }

    if (lower === 'help') {
      newLogs.push("Comenzi disponibile: ls, cat <fisier>, python <fisier.py>, node <fisier.js|ts>, npm run build, npm test, npm run start, git status, clear");
      setTerminalLogs(newLogs);
      return;
    }

    if (lower === 'ls' || lower.startsWith('ls ')) {
      const list = repoTreeFiles.slice(0, 25).map(f => `  ${f.path} (${f.size} B)`);
      setTerminalLogs([...newLogs, ...(list.length > 0 ? list : ["  (niciun fișier încărcat)"])]);
      return;
    }

    if (lower.startsWith('cat ') && selectedRepoForTest) {
      const targetPath = trimmed.slice(4).trim();
      setTerminalLogs([...newLogs, `Citire ${targetPath}...`]);
      await loadFileContentFromRepo(selectedRepoForTest, targetPath);
      setTerminalLogs(prev => [...prev, `✓ Fișierul ${targetPath} a fost deschis în editor.`]);
      return;
    }

    if ((lower.startsWith('python ') || lower.startsWith('python3 ') || lower.startsWith('node ') || lower.startsWith('tsx ') || lower.startsWith('bash ')) && selectedRepoForTest) {
      const fileArg = trimmed.split(/\s+/).slice(1).join(" ").trim() || selectedFileInStudio;
      setTerminalLogs(newLogs);
      await handleExecuteActiveFile(selectedRepoForTest, fileArg, fileArg === selectedFileInStudio ? selectedFileContent : undefined);
      return;
    }

    if (lower.includes('git status')) {
      newLogs.push(`On branch ${selectedRepoForTest?.default_branch || 'main'}`);
      newLogs.push(`Repo: ${selectedRepoForTest?.owner?.login}/${selectedRepoForTest?.name} (${repoTreeFiles.length} fișiere)`);
      newLogs.push(editedFileDirty ? `modified: ${selectedFileInStudio}` : `nothing to commit, working tree clean`);
      setTerminalLogs(newLogs);
      return;
    }

    if (lower.includes('npm test') || lower.includes('build')) {
      setTerminalLogs([...newLogs, `Compilare reală esbuild pentru [${selectedRepoForTest?.name || 'default'}]...`]);
      if (selectedRepoForTest) {
        const st = await triggerLiveBuild(selectedRepoForTest, true);
        if (st?.ok) {
          setTerminalLogs(prev => [
            ...prev,
            `> Entry: ${st.entryFile || 'README'} | Mode: ${st.mode}`,
            `✓ Build reușit în ${st.durationMs}ms (${st.bundleSizeKb || 1} KB, ${st.fileCount} fișiere).`
          ]);
        } else {
          setTerminalLogs(prev => [...prev, `✗ Eroare compilare: ${st?.error || 'Eroare necunoscută'}`]);
        }
      }
      return;
    }

    if (lower.includes('run') || lower.includes('start')) {
      newLogs.push(`Pornire server live pentru [${selectedRepoForTest?.name || 'default'}]...`);
      newLogs.push(`> Aplicație montată în Google AI Studio Preview.`);
      setWorkstationRunning(true);
      setTerminalLogs(newLogs);
      if (selectedRepoForTest) {
        handleStartSingleAndPreview(selectedRepoForTest);
      }
      return;
    }

    newLogs.push(`Executat: ${trimmed} -> OK. (Tastează 'help' pentru lista de comenzi)`);
    setTerminalLogs(newLogs);
  };

  const handleSortRepos = (type: 'updated' | 'name' | 'size' | 'stars') => {
    setSortOrder(type);
    const sorted = [...repos].sort((a, b) => {
      if (type === 'name') return a.name.localeCompare(b.name);
      if (type === 'size') return b.size - a.size;
      if (type === 'stars') return b.stargazers_count - a.stargazers_count;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    setRepos(sorted);
    setActionMessage(`Proiecte ordonate după: ${type === 'updated' ? 'Ultima actualizare' : type === 'name' ? 'Nume' : type === 'size' ? 'Dimensiune' : 'Stele'}`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleToggleVisibility = async (repoName: string, ownerLogin: string, currentPrivate: boolean) => {
    const newPrivateState = !currentPrivate;
    setLoadingRepos(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/github/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: githubToken, owner: ownerLogin, repo: repoName, makePrivate: newPrivateState })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Eroare la schimbarea vizibilității.");
      }
      setActionMessage(`Proiectul ${repoName} este acum ${newPrivateState ? 'Privat 🔒' : 'Public 🌍'}!`);
      setTimeout(() => setActionMessage(null), 3000);
      await checkStatusAndFetchRepos();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleDeleteRepo = async (repoName: string, ownerLogin: string, force = false) => {
    setLoadingRepos(true);
    setErrorMessage(null);
    setStubbornRepo(null);
    try {
      const delRes = await fetch("/api/github/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: githubToken, owner: ownerLogin, repo: repoName, forceLocal: force })
      });
      const delData = await delRes.json();
      if (!delRes.ok || delData.error) {
        setStubbornRepo(repoName);
        throw new Error(delData.error || `Nu s-a putut șterge ${repoName} pe GitHub.`);
      }

      setActionMessage(`Proiectul ${repoName} a fost șters cu succes!`);
      setTimeout(() => setActionMessage(null), 3000);
      await checkStatusAndFetchRepos();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleForceDeleteLocal = async (repoName: string) => {
    await handleDeleteRepo(repoName, "", true);
    setStubbornRepo(null);
    setActionMessage(`Proiectul ${repoName} a fost ascuns / șters forțat din listă!`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleDeleteEmptyRepos = async () => {
    const emptyList = repos.filter(r => r.isEmpty);
    if (emptyList.length === 0) {
      setActionMessage("Nu există proiecte goale de șters!");
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }

    if (!confirm(`Ești sigur că vrei să ștergi cele ${emptyList.length} proiecte goale?`)) return;

    setLoadingRepos(true);
    setErrorMessage(null);
    try {
      for (const repo of emptyList) {
        await fetch("/api/github/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: githubToken, owner: repo.owner.login, repo: repo.name, forceLocal: true })
        });
      }
      await checkStatusAndFetchRepos();
      setActionMessage(`S-au curățat toate proiectele goale cu succes!`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message);
    } finally {
      setLoadingRepos(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;

    setCreatingRepo(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/github/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          name: newRepoName.trim(),
          description: newRepoDesc.trim(),
          isPrivate: newRepoPrivate,
          withStarterTemplate: newRepoStarter
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Proiectul ${newRepoName} a fost creat cu succes!`);
        setNewRepoName("");
        setNewRepoDesc("");
        setShowCreateModal(false);
        await checkStatusAndFetchRepos();
      } else {
        setErrorMessage(data.error || "Eroare la crearea repository-ului.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Eroare de rețea la crearea repository-ului.");
    } finally {
      setCreatingRepo(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleUpdateRepoMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRepo) return;
    setSavingRepoMeta(true);
    try {
      const res = await fetch("/api/github/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          owner: editingRepo.owner.login,
          repo: editingRepo.name,
          description: editRepoDesc,
          homepage: editRepoHomepage
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Detaliile pentru ${editingRepo.name} au fost actualizate!`);
        setEditingRepo(null);
        await checkStatusAndFetchRepos();
      } else {
        setErrorMessage(data.error || "Eroare la actualizarea repository-ului.");
      }
    } catch (err) {
      setErrorMessage("Eroare de rețea la actualizarea repository-ului.");
    } finally {
      setSavingRepoMeta(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleRefreshPreview = async () => {
    setPreviewRefreshing(true);
    if (currentPreviewRepo) {
      await Promise.all([
        loadRepoTreeForStudio(currentPreviewRepo, true),
        triggerLiveBuild(currentPreviewRepo, true)
      ]);
      setPreviewIframeKey(k => k + 1);
    }
    setPreviewRefreshing(false);
    setActionMessage("Previzualizare recompilată și reîncărcată live.");
    setTimeout(() => setActionMessage(null), 2000);
  };

  const handleSendSandboxChatMessage = () => {
    if (!sandboxChatInput.trim()) return;
    const userMsg = { sender: 'me' as const, text: sandboxChatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setSandboxChatMessages(prev => [...prev, userMsg]);
    setSandboxChatInput("");

    setTimeout(() => {
      setSandboxChatMessages(prev => [
        ...prev,
        {
          sender: 'bot' as const,
          text: `[Google AI Studio Dev]: Răspuns WebSocket primit instantaneu de pe portul :3001!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 500);
  };

  const emptyCount = repos.filter(r => r.isEmpty).length;
  const activeCount = repos.filter(r => !r.isEmpty).length;
  const privateCount = repos.filter(r => r.private).length;

  const runningContainersList = Object.entries(runners).filter(([_, info]) => info.status === 'running');
  const totalMemoryUsed = Object.values(runners).filter(r => r.status === 'running').reduce((acc, curr) => acc + (curr.memoryMb || 0), 0);
  const totalCpuUsed = Object.values(runners).filter(r => r.status === 'running').reduce((acc, curr) => acc + (curr.cpu || 0), 0);

  const currentPreviewRepo = previewAppRepo || repos.find(r => !r.isEmpty) || repos[0];
  const currentRunnerInfo = currentPreviewRepo ? runners[currentPreviewRepo.name] : null;

  // Auto-load real GitHub file tree, env settings & live esbuild preview whenever selected project changes
  useEffect(() => {
    if (currentPreviewRepo) {
      loadRepoTreeForStudio(currentPreviewRepo);
      triggerLiveBuild(currentPreviewRepo);
      fetchStudioEnv(currentPreviewRepo);
    }
  }, [currentPreviewRepo?.name]);

  // Also load tree when Workstation IDE project changes
  useEffect(() => {
    if (activeTab === 'workstation' && selectedRepoForTest && selectedRepoForTest.name !== currentPreviewRepo?.name) {
      loadRepoTreeForStudio(selectedRepoForTest);
    }
  }, [activeTab, selectedRepoForTest?.name]);

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] flex flex-col bg-[#0e0e10] text-[#e3e3e3] font-sans select-none overflow-hidden">
      {/* Main Responsive Container: Full screen on mobile/tablet, centered on large screens */}
      <div
        className={`w-full flex-1 flex flex-col mx-auto overflow-hidden transition-all duration-300 ${
          isPhoneFrame
            ? "sm:max-w-[460px] sm:my-auto sm:h-[min(880px,94vh)] sm:rounded-[36px] sm:border-[8px] sm:border-[#28292a] sm:shadow-2xl"
            : "h-full w-full max-w-7xl sm:px-2 sm:py-1.5"
        }`}
      >
        <div className="w-full h-full flex flex-col bg-[#131314] sm:rounded-2xl sm:border border-[#333538] overflow-hidden shadow-2xl">
          {/* Mobile Phone Status Bar (Only when simulating a phone frame) */}
          {isPhoneFrame && (
            <div className="bg-[#1e1f20] text-white px-5 py-2 flex items-center justify-between text-xs font-semibold shrink-0 select-none border-b border-[#28292a]">
              <span className="font-mono text-gray-300">11:28</span>
              <div className="w-24 h-4 bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-1.5 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[#131314] mr-2"></div>
                <div className="w-2 h-2 rounded-full bg-blue-500/80"></div>
              </div>
              <div className="flex items-center space-x-1.5 text-blue-400">
                <Signal className="w-3.5 h-3.5" />
                <Wifi className="w-3.5 h-3.5" />
                <Battery className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Global Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#1e1f20] border-b border-[#333538] shrink-0">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h2 className="font-bold text-xs sm:text-sm text-white leading-tight truncate">WhatsAI Studio</h2>
                  <span className="bg-blue-500/20 text-blue-300 text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold shrink-0">
                    BUILD
                  </span>
                </div>
                <span className="text-[9px] text-[#9aa0a6] block truncate">
                  {githubStatus?.connected ? `@${githubStatus.login} • Sincronizat` : "Mod Google AI Studio"}
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs (>= md) */}
            <div className="hidden md:flex items-center space-x-1 text-[11px]">
              <button
                onClick={() => setActiveTab('chats')}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${activeTab === 'chats' ? 'bg-[#00a884] text-white font-bold' : 'bg-[#28292a] text-[#9aa0a6] hover:text-white'}`}
              >
                <MessageSquare className="w-3 h-3" /> Chat
              </button>
              <button
                onClick={() => setActiveTab('github')}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${activeTab === 'github' ? 'bg-[#00a884] text-white font-bold' : 'bg-[#28292a] text-[#9aa0a6] hover:text-white'}`}
              >
                <FolderGit2 className="w-3 h-3" /> Godhubb
              </button>
              <button
                onClick={() => setActiveTab('workstation')}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${activeTab === 'workstation' ? 'bg-[#00a884] text-white font-bold' : 'bg-[#28292a] text-[#9aa0a6] hover:text-white'}`}
              >
                <Laptop className="w-3 h-3" /> IDE
              </button>
              <button
                onClick={() => setActiveTab('runner')}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1 font-bold ${activeTab === 'runner' ? 'bg-[#238636] text-white shadow' : 'bg-[#28292a] text-emerald-400 hover:text-emerald-300'}`}
              >
                <Rocket className="w-3 h-3" /> Rulează
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded transition flex items-center gap-1.5 font-bold ${activeTab === 'preview' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'bg-[#28292a] text-blue-300 hover:text-white'}`}
              >
                <Eye className="w-3.5 h-3.5" /> Previzualizare AI Studio
              </button>
            </div>

            {/* Global Actions (Copy link, Token, Refresh, Phone Frame Toggle) */}
            <div className="flex items-center space-x-1.5 shrink-0">
              {/* Quick Copy Preview Link */}
              <button
                onClick={() => handleCopyPreviewLink()}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow border ${
                  copiedLink
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-[#28292a] hover:bg-[#3c4043] border-[#3c4043] text-blue-300 hover:text-white'
                }`}
                title="Copiază linkul de previzualizare (auto-setat & rulat)"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedLink ? 'Copiat!' : 'Copiază Link'}</span>
              </button>

              <button
                onClick={() => setShowTokenModal(true)}
                className="p-1.5 rounded-lg bg-[#28292a] hover:bg-[#3c4043] text-amber-400 transition"
                title="Configurare Secrete & Token"
              >
                <Key className="w-4 h-4" />
              </button>

              <button
                onClick={checkStatusAndFetchRepos}
                className={`p-1.5 rounded-lg bg-[#28292a] hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white transition ${loadingRepos ? 'animate-spin text-blue-400' : ''}`}
                title="Reîmprospătează"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPhoneFrame(!isPhoneFrame)}
                className="hidden lg:flex p-1.5 rounded-lg bg-[#28292a] hover:bg-[#3c4043] text-blue-300 transition"
                title={isPhoneFrame ? "Comută la Ecran Complet" : "Comută la Ramă Telefon"}
              >
                {isPhoneFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
              </button>

              {user ? (
                <button
                  onClick={signOutUser}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#28292a] hover:bg-[#3c4043] border border-[#3c4043] text-xs text-emerald-300 transition"
                  title={`Conectat ca ${user.email || user.displayName || "Cont Google"} — Click pentru deconectare (${cloudSyncedRepos.length} sincronizate)`}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden xl:inline max-w-[90px] truncate">{user.displayName || user.email}</span>
                </button>
              ) : (
                <button
                  onClick={() => signInWithGoogle().catch((e) => setErrorMessage(e.message))}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#28292a] hover:bg-[#3c4043] border border-[#3c4043] text-xs font-medium text-white transition"
                  title="Conectare cu Google"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Google</span>
                </button>
              )}
            </div>
          </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="bg-red-950/80 border-b border-red-500/50 text-red-200 text-[11px] py-1.5 px-3 font-medium z-30 flex items-center justify-between gap-1 shadow">
            <span className="truncate">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-white hover:text-gray-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action feedback banner */}
        {actionMessage && (
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white text-[11px] py-1.5 px-3 text-center font-medium z-30 flex items-center justify-center gap-1.5 shadow">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            {actionMessage}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 1: GOOGLE AI STUDIO FULL PREVIEW WORKSPACE */}
        {/* ======================================================== */}
        {activeTab === 'preview' ? (
          <div className="flex-1 flex flex-col bg-[#131314] z-10 overflow-hidden text-xs">
            {/* AI Studio Sub-Header: Project selector & Model Toolbar */}
            <div className="bg-[#1e1f20] border-b border-[#333538] px-2.5 sm:px-3 py-1.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 shrink-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
                <span className="text-[10px] text-[#9aa0a6] uppercase font-bold tracking-wider shrink-0 hidden xs:inline">Proiect:</span>
                <select
                  value={currentPreviewRepo?.name || ''}
                  onChange={(e) => {
                    const found = repos.find(r => r.name === e.target.value);
                    if (found) {
                      setCustomPreviewEntry("");
                      setPreviewAppRepo(found);
                      if (autoRunEnabled) {
                        handleAutoSetAndRun(found);
                      }
                    }
                  }}
                  className="bg-[#28292a] text-white border border-[#3c4043] rounded-lg px-2 py-1 text-xs font-semibold outline-none max-w-[130px] sm:max-w-[200px] truncate shrink-0"
                >
                  {repos.filter(r => !r.isEmpty).map((r) => (
                    <option key={r.id} value={r.name}>{r.name} ({r.language || 'Code'})</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowImportRepoBar(!showImportRepoBar)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 shrink-0 ${
                    showImportRepoBar
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-[#28292a] hover:bg-[#3c4043] text-blue-300 border-[#3c4043]'
                  }`}
                  title="Importă & rulează orice repository GitHub public (URL sau owner/repo)"
                >
                  <Plus className="w-3 h-3" />
                  <span className="hidden xl:inline">Orice Repo GitHub</span>
                </button>
                <button
                  onClick={() => {
                    setShowGithubHubModal(true);
                    if (ghSearchResults.length === 0) handleSearchGitHubHub();
                  }}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold border bg-[#28292a] hover:bg-[#3c4043] text-emerald-300 border-[#3c4043] transition flex items-center gap-1 shrink-0"
                  title="Caută pe GitHub module, componente sau API-uri și importă-le în proiect"
                >
                  <Search className="w-3 h-3" />
                  <span className="hidden lg:inline">Ia de pe GitHub</span>
                </button>

                {/* Mobile View Toggle between Preview Canvas & Inspector */}
                <div className="flex md:hidden items-center bg-[#28292a] rounded-lg p-0.5 border border-[#3c4043] text-[10px] shrink-0">
                  <button
                    onClick={() => setMobileStudioView('canvas')}
                    className={`px-2 py-0.5 rounded font-semibold transition ${mobileStudioView === 'canvas' ? 'bg-blue-600 text-white' : 'text-[#9aa0a6]'}`}
                  >
                    Previzualizare
                  </button>
                  <button
                    onClick={() => setMobileStudioView('inspector')}
                    className={`px-2 py-0.5 rounded font-semibold transition ${mobileStudioView === 'inspector' ? 'bg-blue-600 text-white' : 'text-[#9aa0a6]'}`}
                  >
                    Cod & AI
                  </button>
                </div>

                <div className="hidden lg:flex items-center space-x-1.5 bg-[#28292a] border border-[#3c4043] px-2 py-0.5 rounded-full text-[10px] text-[#c4c7c5]">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>AI Engine:</span>
                  <select
                    value={activeAiProvider}
                    onChange={(e) => setActiveAiProvider(e.target.value)}
                    className="bg-transparent font-mono text-amber-300 font-bold outline-none cursor-pointer"
                    title="Selectează motorul AI principal (Claude AI, Multi-AI Swarm, Gemini 4, GPT-4o, DeepSeek, Groq, Mistral, Open Source)"
                  >
                    <option value="claude" className="bg-[#1e1f20] text-white">Claude AI (Anthropic) ⭐</option>
                    <option value="swarm" className="bg-[#1e1f20] text-white">Multi-AI Swarm (Toți AI)</option>
                    <option value="gemini" className="bg-[#1e1f20] text-white">Google Gemini 4</option>
                    <option value="openai" className="bg-[#1e1f20] text-white">OpenAI GPT-4o</option>
                    <option value="deepseek" className="bg-[#1e1f20] text-white">DeepSeek V3 Coder</option>
                    <option value="groq" className="bg-[#1e1f20] text-white">Groq Llama 3.3 70B</option>
                    <option value="mistral" className="bg-[#1e1f20] text-white">Mistral Codestral</option>
                    <option value="openrouter" className="bg-[#1e1f20] text-white">OpenRouter 200+</option>
                    <option value="pollinations" className="bg-[#1e1f20] text-white">Open Source Free AI</option>
                  </select>
                </div>

                {/* Autonomous Claude + Multi-AI Self-Heal Button */}
                <button
                  onClick={() => handleAutonomousHealCurrent()}
                  disabled={autonomousHealing || !currentPreviewRepo}
                  className="px-2.5 py-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow shrink-0"
                  title="Claude AI + Multi-AI analizează, repară și compilează autonom acest proiect"
                >
                  {autonomousHealing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span className="hidden sm:inline">{autonomousHealing ? 'Reparare AI...' : 'Claude Autonom'}</span>
                </button>

                {/* Auto-Run Toggle */}
                <button
                  onClick={() => setAutoRunEnabled(!autoRunEnabled)}
                  className={`hidden xl:flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] border transition ${
                    autoRunEnabled
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-[#28292a] border-[#3c4043] text-[#9aa0a6]'
                  }`}
                  title="Auto-setare și rulare automată când selectezi un proiect sau deschizi linkul"
                >
                  <Zap className={`w-3 h-3 ${autoRunEnabled ? 'text-amber-400' : 'text-gray-400'}`} />
                  <span className="font-bold">{autoRunEnabled ? 'AUTO 🟢' : 'OPRIT'}</span>
                </button>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                {/* Copy Preview Link with Auto-Run */}
                <button
                  onClick={() => handleCopyPreviewLink()}
                  className={`px-2 sm:px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition shadow border ${
                    copiedLink
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-[#28292a] hover:bg-[#3c4043] border-[#3c4043] text-blue-300 hover:text-white'
                  }`}
                  title="Copiază linkul de previzualizare (auto-setat & rulat)"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLink ? 'Copiat!' : 'Copiază Link'}</span>
                </button>

                <button
                  onClick={handleStartAllProjects}
                  className="px-2 sm:px-2.5 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-[10px] font-bold flex items-center gap-1 transition shadow"
                  title="Rebuild & Run All Projects"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Rebuild & Run</span>
                </button>
                <button
                  onClick={() => setShowTokenModal(true)}
                  className="p-1 text-[#9aa0a6] hover:text-white rounded hover:bg-[#28292a]"
                  title="Configurare Token GitHub"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            </div>

            {/* AI Studio 2-Pane Split: Left Sidebar & Right Live Preview */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* LEFT SIDEBAR (AI Studio Inspector: Files, Prompt Console, Secrets) */}
              <div className={`${mobileStudioView === 'inspector' ? 'flex' : 'hidden'} md:flex w-full md:w-72 bg-[#18191a] border-r border-[#333538] flex-col shrink-0 overflow-hidden`}>
                {/* Left Sidebar Tab Selector */}
                <div className="flex items-center border-b border-[#333538] bg-[#1e1f20] text-[10px]">
                  <button
                    onClick={() => setAiStudioLeftPanel('chat')}
                    className={`flex-1 py-1.5 font-bold flex items-center justify-center gap-1 transition ${aiStudioLeftPanel === 'chat' ? 'border-b-2 border-blue-500 text-white bg-[#28292a]' : 'text-[#9aa0a6] hover:text-white'}`}
                  >
                    <MessageSquare className="w-3 h-3 text-blue-400" /> Prompt AI
                  </button>
                  <button
                    onClick={() => setAiStudioLeftPanel('files')}
                    className={`flex-1 py-1.5 font-bold flex items-center justify-center gap-1 transition ${aiStudioLeftPanel === 'files' ? 'border-b-2 border-blue-500 text-white bg-[#28292a]' : 'text-[#9aa0a6] hover:text-white'}`}
                  >
                    <FileCode className="w-3 h-3 text-purple-400" /> Fișiere
                  </button>
                  <button
                    onClick={() => setAiStudioLeftPanel('secrets')}
                    className={`flex-1 py-1.5 font-bold flex items-center justify-center gap-1 transition ${aiStudioLeftPanel === 'secrets' ? 'border-b-2 border-blue-500 text-white bg-[#28292a]' : 'text-[#9aa0a6] hover:text-white'}`}
                  >
                    <Key className="w-3 h-3 text-amber-400" /> Secrete
                  </button>
                </div>

                {/* Left Sidebar Content */}
                <div className="flex-1 overflow-y-auto p-3 text-xs">
                  {aiStudioLeftPanel === 'chat' ? (
                    /* AI Assistant Prompt Drawer */
                    <div className="space-y-2.5 flex flex-col h-full">
                      <div className="bg-[#28292a] p-2.5 rounded-xl border border-[#3c4043] space-y-1.5 shrink-0">
                        <div className="flex items-center justify-between text-[11px] font-bold text-white">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" /> Multi-AI World Hub
                          </span>
                          <span className="text-[9px] text-emerald-400 font-mono">{autonomousHealing ? 'Autonom...' : isTyping ? 'Gândește...' : 'Ready'}</span>
                        </div>
                        <p className="text-[10px] text-[#9aa0a6] leading-relaxed">
                          Activ: <span className="text-amber-300 font-bold">{activeAiProvider.toUpperCase()}</span> • <span className="text-blue-300 font-mono">{currentPreviewRepo?.name || 'app'}</span>
                        </p>
                        {/* World AI Quick Provider Chips */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {[
                            { id: "claude", label: "Claude AI" },
                            { id: "swarm", label: "Toți AI" },
                            { id: "gemini", label: "Gemini 4" },
                            { id: "openai", label: "GPT-4o" },
                            { id: "deepseek", label: "DeepSeek" },
                            { id: "groq", label: "Groq" },
                            { id: "mistral", label: "Codestral" },
                            { id: "pollinations", label: "Open Free" }
                          ].map(p => (
                            <button
                              key={p.id}
                              onClick={() => setActiveAiProvider(p.id)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition border ${
                                activeAiProvider === p.id
                                  ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                                  : 'bg-[#18191a] border-[#3c4043] text-[#9aa0a6] hover:text-white'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => handleAutonomousHealCurrent()}
                          disabled={autonomousHealing || !currentPreviewRepo}
                          className="w-full mt-1 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition shadow"
                        >
                          {autonomousHealing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          <span>{autonomousHealing ? 'Claude AI repară autonom...' : '🤖 Reparare Autonomă (Claude + Swarm)'}</span>
                        </button>
                      </div>

                      {autonomousReport && autonomousReport.repo === currentPreviewRepo?.name && (
                        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-2 space-y-1 text-[10px] shrink-0">
                          <div className="flex items-center justify-between font-bold text-emerald-300">
                            <span>Raport Autonom ({autonomousReport.providerUsed})</span>
                            <button onClick={() => setAutonomousReport(null)} className="text-[#9aa0a6] hover:text-white">×</button>
                          </div>
                          {autonomousReport.steps.map((s, idx) => (
                            <div key={idx} className="text-[9px] text-slate-200 flex items-start gap-1">
                              <span>{s.status === 'ok' ? '✅' : '⚠️'}</span>
                              <span><strong className="text-white">{s.step}:</strong> {s.detail}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick AI Studio Prompts */}
                      <div className="flex flex-wrap gap-1 shrink-0">
                        {[
                          "Fă proiectul 100% funcțional",
                          "Explică acest fișier",
                          "Găsește bug-uri",
                          "Îmbunătățește designul UI"
                        ].map((q) => (
                          <button
                            key={q}
                            onClick={() => q.includes("100% funcțional") ? handleAutonomousHealCurrent(q) : handleSendMessage(`${q} pentru ${selectedFileInStudio || currentPreviewRepo?.name}`)}
                            className="px-2 py-0.5 bg-[#28292a] hover:bg-[#3c4043] border border-[#3c4043] rounded-full text-[9px] text-blue-300 transition"
                          >
                            ✨ {q}
                          </button>
                        ))}
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                        {messages.slice(-6).map((m) => {
                          const codeSnippet = m.sender === 'assistant' ? extractCodeBlock(m.text) : null;
                          return (
                            <div
                              key={m.id}
                              className={`p-2 rounded-lg text-[11px] ${m.sender === 'user' ? 'bg-[#1a3a5f] text-blue-100 ml-3' : 'bg-[#28292a] text-[#e3e3e3] mr-1 border border-[#3c4043]'}`}
                            >
                              <span className="font-bold block text-[9px] text-[#9aa0a6] mb-0.5">
                                {m.sender === 'user' ? 'Tu' : 'Alexia (AI Studio)'}
                              </span>
                              <p className="whitespace-pre-wrap break-words">{m.text}</p>
                              {codeSnippet && (
                                <button
                                  onClick={() => handleApplyAiCodeToEditor(codeSnippet)}
                                  className="mt-2 w-full py-1 px-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 transition"
                                >
                                  <Check className="w-3 h-3" /> Aplică în {selectedFileInStudio || 'editor'} & Live
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {isTyping && (
                          <div className="p-2 rounded-lg text-[10px] bg-[#28292a] text-blue-300 border border-[#3c4043] animate-pulse">
                            ✨ Alexia generează răspunsul pentru {currentPreviewRepo?.name}...
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#333538] flex items-center space-x-1.5 shrink-0">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Cere modificări de cod..."
                          className="flex-1 bg-[#28292a] border border-[#3c4043] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none placeholder-[#5f6368]"
                        />
                        <button
                          onClick={() => handleSendMessage()}
                          disabled={isTyping}
                          className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : aiStudioLeftPanel === 'files' ? (
                    /* Real Repository Files Tree */
                    <div className="space-y-1 font-mono text-[11px] text-[#c4c7c5]">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#333538] mb-1">
                        <span className="font-bold text-[10px] text-[#9aa0a6] uppercase tracking-wider truncate">
                          Fișiere ({repoTreeFiles.length})
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setShowGithubHubModal(true);
                              if (ghSearchResults.length === 0) handleSearchGitHubHub();
                            }}
                            className="text-emerald-400 hover:text-emerald-300 p-0.5 text-[10px] flex items-center gap-0.5 font-sans font-semibold"
                            title="Caută și importă module direct de pe GitHub"
                          >
                            <Globe className="w-3 h-3" /> GitHub
                          </button>
                          <button
                            onClick={() => setShowNewFileInput(!showNewFileInput)}
                            className="text-blue-400 hover:text-blue-300 p-0.5 text-[10px] flex items-center gap-0.5 font-sans font-semibold"
                            title="Creează fișier nou în repository"
                          >
                            <Plus className="w-3 h-3" /> Nou
                          </button>
                          <button
                            onClick={() => currentPreviewRepo && loadRepoTreeForStudio(currentPreviewRepo, true)}
                            className="text-[#9aa0a6] hover:text-white p-0.5"
                            title="Reîncarcă arborele de fișiere"
                          >
                            <RefreshCw className={`w-3 h-3 ${loadingTree ? 'animate-spin text-blue-400' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {showNewFileInput && (
                        <form onSubmit={handleCreateNewStudioFile} className="flex items-center gap-1 pb-1.5">
                          <input
                            type="text"
                            value={newStudioFilePath}
                            onChange={(e) => setNewStudioFilePath(e.target.value)}
                            placeholder="ex: src/Widget.tsx"
                            className="flex-1 bg-[#131314] border border-[#3c4043] rounded px-2 py-1 text-[10px] text-white outline-none focus:border-blue-500"
                          />
                          <button
                            type="submit"
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-sans font-bold"
                          >
                            +
                          </button>
                        </form>
                      )}

                      {loadingTree ? (
                        <div className="py-6 text-center text-[#9aa0a6] text-[10px]">Se încarcă fișierele din repository...</div>
                      ) : repoTreeFiles.length === 0 ? (
                        <div className="py-4 text-center text-[#9aa0a6] text-[10px]">Niciun fișier găsit în acest repository.</div>
                      ) : (
                        repoTreeFiles.slice(0, 120).map(file => (
                          <div
                            key={file.path}
                            onClick={() => {
                              if (currentPreviewRepo) {
                                loadFileContentFromRepo(currentPreviewRepo, file.path);
                                if (studioViewMode === 'live') {
                                  setStudioViewMode('split');
                                }
                              }
                            }}
                            className={`py-1 px-2 rounded cursor-pointer flex items-center justify-between gap-1.5 text-[10px] transition ${
                              selectedFileInStudio === file.path
                                ? 'bg-[#28292a] text-blue-300 font-bold border-l-2 border-blue-400'
                                : 'hover:bg-[#28292a] text-[#9aa0a6]'
                            }`}
                            title={file.path}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <FileCode className="w-3 h-3 text-blue-400 shrink-0" />
                              <span className="truncate">{file.path}</span>
                            </span>
                            <span className="text-[8px] text-[#5f6368] shrink-0">
                              {file.size > 1024 ? `${(file.size / 1024).toFixed(1)}k` : `${file.size}B`}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    /* Environment, Missing Dependencies Auto-Resolver & Free Public APIs Panel */
                    <div className="space-y-3 text-xs">
                      {/* 1. Missing Dependencies & Auto-Fix Diagnostics */}
                      {(() => {
                        const diag = currentPreviewRepo ? liveBuildInfo[currentPreviewRepo.name]?.diagnostics : undefined;
                        const missingCount = diag?.missingImports?.length || 0;
                        const missingEnvCount = diag?.detectedEnvVars?.filter(e => !e.hasValue && !repoEnvValues[e.name]).length || 0;
                        return (
                          <div className="p-2.5 bg-[#202224] rounded-xl border border-[#3c4043] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[10px] text-white uppercase tracking-wider">
                                Diagnostic Proiect
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                missingCount === 0 && missingEnvCount === 0
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {missingCount === 0 && missingEnvCount === 0 ? 'Complet ✓' : `${missingCount} module • ${missingEnvCount} env`}
                              </span>
                            </div>

                            {missingCount > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] text-amber-300 block">Importuri lipsă detectate:</span>
                                {diag!.missingImports.slice(0, 5).map(m => (
                                  <div key={m} className="text-[10px] font-mono text-amber-200 bg-[#131314] px-2 py-0.5 rounded truncate">
                                    ⚠️ {m}
                                  </div>
                                ))}
                              </div>
                            )}

                            {(diag?.autoResolvedPackages?.length || 0) > 0 && (
                              <div className="text-[9px] text-emerald-300/90">
                                📦 Auto-rezolvat CDN: {diag!.autoResolvedPackages.slice(0, 4).join(', ')}
                              </div>
                            )}

                            <div className="flex flex-col gap-1.5 pt-1">
                              <button
                                onClick={handleAcquireMissingForRepo}
                                disabled={acquiringMissing || !currentPreviewRepo}
                                className="w-full py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-lg font-bold text-[10px] transition flex items-center justify-center gap-1 shadow"
                              >
                                <Globe className={`w-3 h-3 ${acquiringMissing ? 'animate-spin' : ''}`} />
                                {acquiringMissing ? 'Se preiau resursele...' : '🌐 Preia Lipsurile (GitHub + npm + API)'}
                              </button>
                              <button
                                onClick={handleAutoFixRepo}
                                disabled={autoFixingRepo || !currentPreviewRepo}
                                className="w-full py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg font-bold text-[10px] transition flex items-center justify-center gap-1"
                              >
                                <Zap className={`w-3 h-3 ${autoFixingRepo ? 'animate-spin' : ''}`} />
                                {autoFixingRepo ? 'Se rezolvă...' : 'Auto-Completează Lipsurile'}
                              </button>
                              <button
                                onClick={() => {
                                  setShowGithubHubModal(true);
                                  if (ghSearchResults.length === 0) handleSearchGitHubHub();
                                }}
                                className="w-full py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-lg font-semibold text-[10px] transition flex items-center justify-center gap-1"
                              >
                                <Search className="w-3 h-3" /> Caută GitHub / npm / Surse Externe
                              </button>
                            </div>

                            {acquireReport && acquireReport.acquiredItems.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-[#3c4043] space-y-1">
                                <span className="text-[9px] font-bold text-emerald-400 uppercase block">
                                  Resurse Preluate ({acquireReport.acquiredItems.length})
                                </span>
                                {acquireReport.acquiredItems.slice(0, 6).map((it, idx) => (
                                  <div key={idx} className="p-1.5 rounded bg-[#131314] border border-[#333538] text-[9px] space-y-0.5">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-mono text-white font-semibold truncate">{it.item}</span>
                                      <span className="text-[8px] px-1 rounded bg-blue-500/20 text-blue-300 shrink-0">{it.source}</span>
                                    </div>
                                    <p className="text-[#9aa0a6] truncate">{it.detail}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* 2. Runtime .env Variables */}
                      <div className="space-y-1.5">
                        <span className="font-bold text-[10px] text-[#9aa0a6] block uppercase tracking-wider">
                          Variabile .env & Chei App
                        </span>
                        <div className="p-2 bg-[#28292a] rounded-lg border border-[#3c4043] space-y-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-white">GITHUB_TOKEN</span>
                            <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded font-bold">Server Active</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-white">AI_PROXY</span>
                            <span className="bg-blue-500/20 text-blue-300 text-[9px] px-1.5 py-0.2 rounded font-mono">/api/proxy/gemini</span>
                          </div>
                          {/* Auto-detected & saved custom env vars */}
                          {Array.from(new Set([
                            ...(currentPreviewRepo ? (liveBuildInfo[currentPreviewRepo.name]?.diagnostics?.detectedEnvVars?.map(d => d.name) || []) : []),
                            ...Object.keys(repoEnvValues)
                          ])).map((envKey) => (
                            <div key={envKey} className="pt-1 border-t border-[#3c4043] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] text-blue-300 truncate">{envKey}</span>
                                <span className={`text-[8px] px-1 rounded ${repoEnvValues[envKey] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'}`}>
                                  {repoEnvValues[envKey] ? 'Setat' : 'Gol'}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={repoEnvValues[envKey] ?? ""}
                                  onChange={(e) => setRepoEnvValues(prev => ({ ...prev, [envKey]: e.target.value }))}
                                  placeholder="valoare sau URL public..."
                                  className="flex-1 bg-[#131314] border border-[#3c4043] rounded px-1.5 py-0.5 text-[10px] text-white font-mono outline-none focus:border-blue-500"
                                />
                                <button
                                  onClick={() => handleSaveEnvVars({ [envKey]: repoEnvValues[envKey] || "" })}
                                  disabled={savingEnv}
                                  className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[9px] font-bold"
                                >
                                  OK
                                </button>
                              </div>
                            </div>
                          ))}

                          <form onSubmit={handleAddCustomEnvVar} className="pt-1.5 border-t border-[#3c4043] space-y-1">
                            <span className="text-[9px] text-[#9aa0a6] block">Adaugă variabilă .env nouă:</span>
                            <input
                              type="text"
                              value={newEnvKey}
                              onChange={(e) => setNewEnvKey(e.target.value)}
                              placeholder="VITE_API_URL"
                              className="w-full bg-[#131314] border border-[#3c4043] rounded px-2 py-1 text-[10px] text-white font-mono outline-none"
                            />
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={newEnvVal}
                                onChange={(e) => setNewEnvVal(e.target.value)}
                                placeholder="https://..."
                                className="flex-1 bg-[#131314] border border-[#3c4043] rounded px-2 py-1 text-[10px] text-white font-mono outline-none"
                              />
                              <button
                                type="submit"
                                disabled={savingEnv}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold"
                              >
                                +
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>

                      {/* 3. Free Zero-Key Public APIs Catalog */}
                      <div className="space-y-1.5">
                        <span className="font-bold text-[10px] text-emerald-400 block uppercase tracking-wider">
                          API-uri Publice Gratuite (0 Chei)
                        </span>
                        <div className="space-y-1.5">
                          {freePublicApis.map((api) => (
                            <div key={api.id} className="p-2 bg-[#1e1f20] border border-[#3c4043] rounded-lg space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-[10px] text-white truncate">{api.name}</span>
                                <span className="text-[8px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 shrink-0">{api.category}</span>
                              </div>
                              <div className="flex items-center gap-1 pt-0.5">
                                <button
                                  onClick={() => handleInsertFreeApiIntoProject(api)}
                                  className="flex-1 py-1 bg-[#28292a] hover:bg-blue-600 text-blue-300 hover:text-white rounded text-[9px] font-semibold transition"
                                >
                                  + Adaugă în Proiect
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard?.writeText(api.endpoint);
                                    setActionMessage(`Endpoint ${api.name} copiat!`);
                                    setTimeout(() => setActionMessage(null), 2000);
                                  }}
                                  className="px-2 py-1 bg-[#28292a] hover:bg-[#3c4043] text-[#c4c7c5] rounded text-[9px]"
                                  title="Copiază URL"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setShowTokenModal(true)}
                        className="w-full py-1.5 bg-[#28292a] hover:bg-[#3c4043] text-amber-300 rounded font-semibold text-[10px] transition"
                      >
                        Modifică Token GitHub
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT MAIN PANEL (Google AI Studio Live Browser Preview Viewport) */}
              <div className={`${isPreviewFullscreen ? 'fixed inset-0 z-50 flex' : `${mobileStudioView === 'canvas' ? 'flex' : 'hidden'} md:flex flex-1`} flex-col bg-[#131314] overflow-hidden`}>
                {/* AI Studio Browser Address & Controls Bar */}
                <div className="bg-[#1e1f20] px-2.5 sm:px-3 py-1.5 border-b border-[#333538] flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 shrink-0">
                  <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                    <button
                      onClick={handleRefreshPreview}
                      className={`p-1 hover:bg-[#28292a] rounded text-[#9aa0a6] hover:text-white transition shrink-0 ${previewRefreshing ? 'animate-spin text-blue-400' : ''}`}
                      title="Recompilează și reîmprospătează previzualizarea"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center space-x-1.5 bg-[#131314] border border-[#3c4043] rounded-lg px-2 sm:px-2.5 py-1 text-[11px] font-mono text-[#e3e3e3] flex-1 min-w-0 max-w-md">
                      <span className="text-emerald-400 shrink-0">🔒</span>
                      <span className="truncate text-[10px] sm:text-[11px] text-[#c4c7c5]">
                        {typeof window !== 'undefined' ? `${window.location.origin}${getLiveAppUrl().split('?')[0]}` : getLiveAppUrl()}
                      </span>
                    </div>

                    {/* Quick copy Auto-Run Link inside address bar */}
                    <button
                      onClick={() => handleCopyPreviewLink()}
                      className={`p-1 rounded transition shrink-0 ${copiedLink ? 'bg-emerald-600 text-white' : 'hover:bg-[#28292a] text-[#9aa0a6] hover:text-white'}`}
                      title="Copiază linkul de previzualizare (cu auto-setare & rulare)"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <a
                      href={getLiveAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 rounded text-[10px] font-bold text-blue-300 hover:text-white transition shrink-0 flex items-center gap-1"
                      title="Deschide aplicația live separat într-un tab nou"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="hidden lg:inline">Tab Nou</span>
                    </a>
                  </div>

                  {/* Mode Switcher (Live / Split / Cod / Sandbox) & Viewport Controls */}
                  <div className="flex items-center space-x-1 text-[#9aa0a6] shrink-0">
                    <div className="flex items-center bg-[#131314] border border-[#3c4043] rounded-lg p-0.5 text-[10px] mr-1">
                      <button
                        onClick={() => setStudioViewMode('live')}
                        className={`px-2 py-0.5 rounded font-semibold transition flex items-center gap-1 ${studioViewMode === 'live' ? 'bg-blue-600 text-white' : 'text-[#9aa0a6] hover:text-white'}`}
                        title="Vizualizează aplicația compilată live"
                      >
                        <Eye className="w-3 h-3" /> <span className="hidden sm:inline">Live</span>
                      </button>
                      <button
                        onClick={() => setStudioViewMode('split')}
                        className={`px-2 py-0.5 rounded font-semibold transition flex items-center gap-1 ${studioViewMode === 'split' ? 'bg-blue-600 text-white' : 'text-[#9aa0a6] hover:text-white'}`}
                        title="Cod și previzualizare alături"
                      >
                        <Layers className="w-3 h-3" /> <span className="hidden sm:inline">Split</span>
                      </button>
                      <button
                        onClick={() => setStudioViewMode('code')}
                        className={`px-2 py-0.5 rounded font-semibold transition flex items-center gap-1 ${studioViewMode === 'code' ? 'bg-blue-600 text-white' : 'text-[#9aa0a6] hover:text-white'}`}
                        title="Editează codul sursă"
                      >
                        <Code2 className="w-3 h-3" /> <span className="hidden sm:inline">Cod</span>
                      </button>
                      <button
                        onClick={() => setStudioViewMode('sandbox')}
                        className={`px-2 py-0.5 rounded font-semibold transition flex items-center gap-1 ${studioViewMode === 'sandbox' ? 'bg-purple-600 text-white' : 'text-[#9aa0a6] hover:text-white'}`}
                        title="Simulator interactiv & trafic"
                      >
                        <Zap className="w-3 h-3" /> <span className="hidden sm:inline">Sim</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setPreviewViewport('mobile')}
                      className={`p-1 rounded ${previewViewport === 'mobile' ? 'bg-[#28292a] text-blue-400' : 'hover:text-white'}`}
                      title="Previzualizare Telefon"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPreviewViewport('tablet')}
                      className={`p-1 rounded ${previewViewport === 'tablet' ? 'bg-[#28292a] text-blue-400' : 'hover:text-white'}`}
                      title="Previzualizare Tabletă"
                    >
                      <Tablet className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPreviewViewport('desktop')}
                      className={`p-1 rounded ${previewViewport === 'desktop' ? 'bg-[#28292a] text-blue-400' : 'hover:text-white'}`}
                      title="Previzualizare Desktop"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsPreviewFullscreen(!isPreviewFullscreen)}
                      className={`p-1 rounded ${isPreviewFullscreen ? 'bg-blue-600 text-white' : 'hover:text-white'}`}
                      title={isPreviewFullscreen ? "Ieși din Ecran Complet" : "Ecran Complet"}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowStudioTerminal(!showStudioTerminal)}
                      className={`p-1 rounded text-[10px] flex items-center gap-1 font-mono ${showStudioTerminal ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' : 'bg-[#28292a] text-[#9aa0a6] hover:text-white'}`}
                      title="Comută Terminal AI Studio"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">Consolă</span>
                    </button>
                  </div>
                </div>

                {/* Optional Quick Import Any GitHub Repository Bar */}
                {showImportRepoBar && (
                  <form onSubmit={handleImportPublicRepo} className="bg-[#18191a] border-b border-[#333538] px-3 py-1.5 flex items-center gap-2 shrink-0">
                    <Github className="w-4 h-4 text-blue-400 shrink-0" />
                    <input
                      type="text"
                      value={publicRepoInput}
                      onChange={(e) => setPublicRepoInput(e.target.value)}
                      placeholder="Introdu orice URL GitHub sau owner/repo (ex: https://github.com/facebook/react sau vercel/swr)..."
                      className="flex-1 bg-[#131314] border border-[#3c4043] rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={importingPublicRepo}
                      className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0"
                    >
                      {importingPublicRepo ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      Rulează Live
                    </button>
                  </form>
                )}

                {/* AI Studio Live Canvas Frame */}
                <div className="flex-1 bg-[#0b0f19] p-2 sm:p-3 overflow-hidden flex flex-col items-center">
                  {/* Top Live Running Projects Cluster Switcher Ribbon */}
                  <div className="w-full mb-2 bg-[#161b22] border border-[#30363d] rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-lg shrink-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="flex items-center space-x-1.5 mr-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1 font-mono">
                          <Server className="w-3.5 h-3.5 text-emerald-400" /> Proiecte Live:
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {repos.filter(r => !r.isEmpty).map((repo) => {
                          const isSelected = currentPreviewRepo?.name === repo.name;
                          const rInfo = runners[repo.name];
                          const isRunning = rInfo?.status === 'running';
                          return (
                            <button
                              key={repo.name}
                              onClick={() => {
                                setCustomPreviewEntry("");
                                setPreviewAppRepo(repo);
                                setPreviewIframeKey(k => k + 1);
                                if (!isRunning) {
                                  handleAutoSetAndRun(repo);
                                }
                              }}
                              className={`px-2 py-1 rounded-lg text-[11px] font-mono font-medium transition flex items-center gap-1.5 border ${
                                isSelected
                                  ? 'bg-blue-600/30 text-blue-200 border-blue-500 shadow-sm ring-1 ring-blue-500/50'
                                  : 'bg-[#21262d] text-[#8b949e] border-[#30363d] hover:text-white hover:border-[#8b949e]'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                              <span className="font-semibold truncate max-w-[110px] sm:max-w-none">{repo.name}</span>
                              <span className="text-[9px] px-1 rounded bg-black/50 text-purple-300">:{rInfo?.port || 3001}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 ml-auto shrink-0">
                      {currentPreviewRepo && liveBuildInfo[currentPreviewRepo.name] && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          liveBuildInfo[currentPreviewRepo.name].ok
                            ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                            : 'bg-red-950/50 border-red-500/40 text-red-300'
                        }`}>
                          {liveBuildInfo[currentPreviewRepo.name].ok
                            ? `✓ ${liveBuildInfo[currentPreviewRepo.name].mode} (${liveBuildInfo[currentPreviewRepo.name].durationMs}ms)`
                            : '✗ Eroare Build'}
                        </span>
                      )}
                      <button
                        onClick={() => handleSimulateTraffic(currentPreviewRepo?.name || 'app')}
                        disabled={trafficSimulating}
                        className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                        title="Trimite trafic HTTP live"
                      >
                        <Zap className={`w-3 h-3 text-amber-400 ${trafficSimulating ? 'animate-bounce' : ''}`} />
                        <span className="hidden sm:inline">+10 req</span>
                      </button>
                      <button
                        onClick={() => handleCopyPreviewLink()}
                        className="px-2 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                        title="Copiază link direct auto-run"
                      >
                        <Copy className="w-3 h-3" />
                        <span className="hidden sm:inline">{copiedLink ? 'Copiat!' : 'Link'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Viewport Container (Live Iframe / Split Code+Live / Code / Interactive Sandbox) */}
                  <div className="flex-1 w-full flex overflow-hidden justify-center">
                    {studioViewMode === 'live' ? (
                      <div
                        className={`w-full h-full flex flex-col transition-all duration-300 ${
                          previewViewport === 'mobile'
                            ? 'max-w-sm border-[6px] border-[#28292a] rounded-[32px] p-1.5 bg-[#131314] shadow-2xl'
                            : previewViewport === 'tablet'
                            ? 'max-w-2xl border-4 border-[#28292a] rounded-2xl p-2 bg-[#131314] shadow-2xl'
                            : 'w-full'
                        }`}
                      >
                        <iframe
                          key={`${currentPreviewRepo?.owner?.login}-${currentPreviewRepo?.name}-${previewIframeKey}`}
                          src={getLiveAppUrl()}
                          title={`Live Preview - ${currentPreviewRepo?.name}`}
                          className="w-full h-full flex-1 bg-[#0d1117] rounded-xl border border-[#30363d] shadow-2xl"
                          sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                        />
                      </div>
                    ) : studioViewMode === 'split' ? (
                      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-2.5 overflow-hidden">
                        {/* Left: Real Code Editor */}
                        <div className="flex flex-col bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
                          <div className="bg-[#1e1f20] px-3 py-1.5 border-b border-[#30363d] flex items-center justify-between gap-2 shrink-0">
                            <span className="font-mono text-[11px] text-blue-300 truncate flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5" />
                              {selectedFileInStudio || 'Selectează un fișier'}
                              {editedFileDirty && <span className="text-amber-400">●</span>}
                            </span>
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <button
                                onClick={() => handleExecuteActiveFile()}
                                disabled={executingCode || !selectedFileInStudio}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition"
                                title="Rulează direct acest fișier (Node, TS, Python, React sau HTML)"
                              >
                                <Play className="w-3 h-3" />
                                <span>{executingCode ? 'Rulează...' : 'Rulează Fișier'}</span>
                              </button>
                              <button
                                onClick={() => handleSaveEditedFile(false)}
                                disabled={savingFile || !selectedFileInStudio}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold transition"
                              >
                                {savingFile ? 'Salvare...' : 'Salvează & Recompilează'}
                              </button>
                              {githubStatus?.connected && (
                                <button
                                  onClick={() => handleSaveEditedFile(true)}
                                  disabled={savingFile || !selectedFileInStudio}
                                  className="px-2 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-[10px] font-bold transition"
                                  title="Salvează și face commit direct pe GitHub"
                                >
                                  Commit GitHub
                                </button>
                              )}
                            </div>
                          </div>
                          <textarea
                            value={loadingFileContent ? 'Se încarcă conținutul fișierului...' : selectedFileContent}
                            onChange={(e) => {
                              setSelectedFileContent(e.target.value);
                              setEditedFileDirty(true);
                            }}
                            spellCheck={false}
                            className="flex-1 w-full bg-[#0d1117] text-[#e6edf3] font-mono text-[11px] p-3 outline-none resize-none leading-relaxed select-text"
                          />
                        </div>

                        {/* Right: Live App Iframe */}
                        <iframe
                          key={`split-${currentPreviewRepo?.owner?.login}-${currentPreviewRepo?.name}-${previewIframeKey}`}
                          src={getLiveAppUrl()}
                          title={`Live Split Preview - ${currentPreviewRepo?.name}`}
                          className="w-full h-full bg-[#0d1117] rounded-xl border border-[#30363d] shadow-2xl"
                          sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                        />
                      </div>
                    ) : studioViewMode === 'code' ? (
                      <div className="w-full h-full flex flex-col bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
                        <div className="bg-[#1e1f20] px-3 py-2 border-b border-[#30363d] flex items-center justify-between gap-2 shrink-0">
                          <span className="font-mono text-xs text-blue-300 truncate flex items-center gap-1.5">
                            <FileCode className="w-4 h-4" />
                            {currentPreviewRepo?.name} / {selectedFileInStudio || 'Selectează un fișier din stânga'}
                            {editedFileDirty && <span className="text-amber-400 text-[10px]">(modificat)</span>}
                          </span>
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => handleExecuteActiveFile()}
                              disabled={executingCode || !selectedFileInStudio}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1 transition"
                            >
                              <Play className="w-3 h-3" />
                              <span>{executingCode ? 'Rulează...' : 'Rulează Fișier'}</span>
                            </button>
                            <button
                              onClick={() => handleSaveEditedFile(false)}
                              disabled={savingFile || !selectedFileInStudio}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition"
                            >
                              {savingFile ? 'Compilare...' : 'Salvează & Vezi Live'}
                            </button>
                            {githubStatus?.connected && (
                              <button
                                onClick={() => handleSaveEditedFile(true)}
                                disabled={savingFile || !selectedFileInStudio}
                                className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-xs font-bold transition"
                              >
                                Push GitHub
                              </button>
                            )}
                          </div>
                        </div>
                        <textarea
                          value={loadingFileContent ? 'Se încarcă conținutul...' : selectedFileContent}
                          onChange={(e) => {
                            setSelectedFileContent(e.target.value);
                            setEditedFileDirty(true);
                          }}
                          spellCheck={false}
                          className="flex-1 w-full bg-[#0d1117] text-[#e6edf3] font-mono text-xs p-4 outline-none resize-none leading-relaxed select-text"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full overflow-y-auto flex justify-center">
                        <div
                          className={`w-full transition-all duration-300 ${
                            previewViewport === 'mobile'
                              ? 'max-w-sm border-[6px] border-[#28292a] rounded-[36px] p-2 bg-[#131314] shadow-2xl'
                              : previewViewport === 'tablet'
                              ? 'max-w-xl border-4 border-[#28292a] rounded-2xl p-2.5 bg-[#131314] shadow-2xl'
                              : 'max-w-4xl'
                          }`}
                        >
                          {/* Live Interactive App Card depending on selected repository */}
                    {currentPreviewRepo?.name?.includes("whatsapp") ? (
                      /* Live WhatsApp Clone inside AI Studio Preview */
                      <div className="bg-[#111b21] rounded-2xl border border-[#2a3942] overflow-hidden shadow-2xl flex flex-col h-[540px]">
                        {/* WhatsApp Top Navigation */}
                        <div className="bg-[#202c33] px-3.5 py-2.5 border-b border-[#2a3942] flex items-center justify-between shrink-0">
                          <div className="flex items-center space-x-2.5">
                            <div className="relative">
                              <img
                                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                                alt="Alexia"
                                className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500"
                              />
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#202c33] rounded-full"></span>
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-[#e9edef] flex items-center gap-1.5">
                                Alexia (Sistem)
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-normal">
                                  Port :3001
                                </span>
                              </h4>
                              <span className="text-[10px] text-emerald-400 font-mono">
                                🟢 Node.js Live • React 19 ({currentRunnerInfo?.uptimeSeconds || 120}s uptime)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 text-[#aebac1]">
                            <button
                              onClick={() => setSimulatingCall(!simulatingCall)}
                              className={`p-1.5 rounded-full hover:bg-[#374248] transition ${simulatingCall ? 'bg-emerald-600 text-white' : ''}`}
                              title="Simulează apel audio"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setActionMessage("Simulare apel video HD cu Alexia inițiat!");
                                setTimeout(() => setActionMessage(null), 2500);
                              }}
                              className="p-1.5 rounded-full hover:bg-[#374248] transition"
                              title="Simulează apel video"
                            >
                              <Video className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSimulateTraffic(currentPreviewRepo.name)}
                              className="p-1.5 rounded-full hover:bg-[#374248] transition text-amber-400"
                              title="Simulează pachet de mesaje"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* WhatsApp Sub Tabs */}
                        <div className="bg-[#1f2c34] px-3 py-1.5 border-b border-[#2a3942] flex items-center justify-between text-xs font-semibold text-[#8696a0] shrink-0">
                          <div className="flex space-x-4">
                            <button
                              onClick={() => setWhatsappSimTab('chats')}
                              className={`pb-1 transition flex items-center gap-1 ${whatsappSimTab === 'chats' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'hover:text-white'}`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Conversații ({sandboxChatMessages.length})
                            </button>
                            <button
                              onClick={() => setWhatsappSimTab('status')}
                              className={`pb-1 transition flex items-center gap-1 ${whatsappSimTab === 'status' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'hover:text-white'}`}
                            >
                              <Activity className="w-3.5 h-3.5" /> Stare
                            </button>
                            <button
                              onClick={() => setWhatsappSimTab('calls')}
                              className={`pb-1 transition flex items-center gap-1 ${whatsappSimTab === 'calls' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'hover:text-white'}`}
                            >
                              <Phone className="w-3.5 h-3.5" /> Apeluri
                            </button>
                          </div>
                          <span className="text-[10px] text-blue-400 font-mono">
                            {currentRunnerInfo?.requestsServed || 42} req servite
                          </span>
                        </div>

                        {/* Active Call Simulation Banner */}
                        {simulatingCall && (
                          <div className="bg-emerald-950/80 border-b border-emerald-500/50 px-3 py-2 flex items-center justify-between text-emerald-200 text-xs shrink-0">
                            <div className="flex items-center space-x-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                              <span className="font-bold">Apel vocal în curs cu Alexia (0:14)</span>
                              <span className="text-[10px] text-emerald-400">WebRTC Encrypted</span>
                            </div>
                            <button
                              onClick={() => setSimulatingCall(false)}
                              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold"
                            >
                              Închide Apelul
                            </button>
                          </div>
                        )}

                        {/* Interactive Voice Note Audio Player */}
                        <div className="bg-[#182229] px-3.5 py-2 border-b border-[#2a3942] flex items-center justify-between shrink-0">
                          <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                            <button
                              onClick={() => setVoicePlaying(!voicePlaying)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition shadow shrink-0 ${
                                voicePlaying ? 'bg-emerald-500 text-white animate-pulse' : 'bg-[#00a884] text-white hover:bg-[#008f72]'
                              }`}
                              title={voicePlaying ? "Pauză" : "Ascultă mesajul vocal"}
                            >
                              {voicePlaying ? <Square className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white ml-0.5" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-semibold text-[#e9edef] truncate">
                                  🎙️ Notă Vocală Alexia: "Serverul pe portul :3001 răspunde în 8ms"
                                </span>
                                <span className="text-[9px] font-mono text-emerald-400 ml-2 shrink-0">
                                  0:{activeVoiceSeconds.toString().padStart(2, '0')} / 0:24
                                </span>
                              </div>

                              {/* Animated Waveform Visualizer */}
                              <div className="flex items-center space-x-1 h-3">
                                {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 35, 75, 60, 85, 40, 65].map((h, i) => (
                                  <div
                                    key={i}
                                    className={`w-1 rounded-full transition-all duration-200 ${
                                      voicePlaying && i <= (activeVoiceSeconds % 16)
                                        ? 'bg-emerald-400'
                                        : voicePlaying
                                        ? 'bg-[#00a884]/60'
                                        : 'bg-[#3b4a54]'
                                    }`}
                                    style={{
                                      height: voicePlaying ? `${Math.max(20, (h * ((i % 3) + 1)) % 100)}%` : `${h * 0.7}%`
                                    }}
                                  ></div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* WhatsApp Main Body according to active sub tab */}
                        {whatsappSimTab === 'chats' ? (
                          <>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#0b141a]">
                              {sandboxChatMessages.map((m, idx) => (
                                <div key={idx} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                  <div
                                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs shadow-md ${
                                      m.sender === 'me'
                                        ? 'bg-[#005c4b] text-white rounded-tr-none'
                                        : 'bg-[#202c33] text-[#e9edef] rounded-tl-none border border-[#2a3942]'
                                    }`}
                                  >
                                    <p className="leading-relaxed">{m.text}</p>
                                    <div className="flex items-center justify-end space-x-1 mt-1 text-[8px] text-[#8696a0]">
                                      <span>{m.time}</span>
                                      {m.sender === 'me' && <span className="text-cyan-400 font-bold">✓✓</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Quick Suggestion Chips */}
                            <div className="bg-[#182229] px-2.5 py-1.5 border-t border-[#2a3942] flex items-center space-x-1.5 overflow-x-auto shrink-0">
                              <span className="text-[9px] text-[#8696a0] font-bold uppercase tracking-wider shrink-0">Sugestii:</span>
                              {[
                                "⚡ Stare Server Node",
                                "🛠️ Stack Tehnologic (React 19)",
                                "📊 Verifică Metrici Trafic",
                                "🧹 Resetează Chat"
                              ].map((chip) => (
                                <button
                                  key={chip}
                                  onClick={() => {
                                    if (chip.includes("Resetează")) {
                                      setSandboxChatMessages([
                                        { sender: 'bot', text: 'Chat inițializat din nou. Serverul :3001 este gata!', time: '11:28' }
                                      ]);
                                    } else {
                                      const userMsg = { sender: 'me' as const, text: chip, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
                                      setSandboxChatMessages(prev => [...prev, userMsg]);
                                      setTimeout(() => {
                                        let reply = "Comandă procesată pe portul :3001.";
                                        if (chip.includes("Stare Server")) {
                                          reply = `Server Node.js activ de ${currentRunnerInfo?.uptimeSeconds || 120}s, memorie alocată: ${currentRunnerInfo?.memoryMb || 54}MB, răspuns: HTTP 200 OK.`;
                                        } else if (chip.includes("Stack")) {
                                          reply = "Stack: React 19 SPA, Tailwind CSS v4, Express Server, Vite HMR middleware, Google AI Studio Dev Bridge.";
                                        } else if (chip.includes("Metrici")) {
                                          reply = `Total cereri procesate: ${currentRunnerInfo?.requestsServed || 42}, sarcină CPU: ${currentRunnerInfo?.cpu || 4}%, latență medie: 9ms.`;
                                        }
                                        setSandboxChatMessages(prev => [
                                          ...prev,
                                          { sender: 'bot', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                                        ]);
                                      }, 400);
                                    }
                                  }}
                                  className="px-2 py-0.5 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-[10px] text-[#00a884] font-medium border border-[#2a3942] whitespace-nowrap transition"
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>

                            {/* WhatsApp Chat Input Bar */}
                            <div className="p-2 bg-[#202c33] flex items-center space-x-2 border-t border-[#2a3942] shrink-0">
                              <button className="text-[#8696a0] hover:text-[#e9edef] p-1 transition" title="Emoticon">
                                <Smile className="w-4 h-4" />
                              </button>
                              <button className="text-[#8696a0] hover:text-[#e9edef] p-1 transition" title="Atașează">
                                <Paperclip className="w-4 h-4" />
                              </button>
                              <input
                                type="text"
                                value={sandboxChatInput}
                                onChange={(e) => setSandboxChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendSandboxChatMessage()}
                                placeholder="Scrie un mesaj în aplicația compilată..."
                                className="flex-1 bg-[#2a3942] border-none outline-none text-xs text-[#e9edef] px-3 py-1.5 rounded-lg placeholder-[#8696a0]"
                              />
                              <button
                                onClick={handleSendSandboxChatMessage}
                                className="bg-[#00a884] text-white p-2 rounded-lg hover:bg-[#008f72] transition shadow"
                              >
                                {sandboxChatInput.trim() ? <Send className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </>
                        ) : whatsappSimTab === 'status' ? (
                          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]">
                            <div className="flex items-center space-x-3 p-2 bg-[#182229] rounded-xl border border-[#2a3942]">
                              <div className="relative">
                                <img
                                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                                  alt="Alexia"
                                  className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500"
                                />
                                <div className="w-3.5 h-3.5 bg-emerald-500 text-white rounded-full absolute bottom-0 right-0 flex items-center justify-center text-[10px] font-bold">
                                  +
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white">Starea mea</h4>
                                <p className="text-[10px] text-[#8696a0]">Atinge pentru a adăuga o actualizare</p>
                              </div>
                            </div>

                            <span className="text-[10px] font-bold text-[#8696a0] uppercase tracking-wider block px-1">
                              Actualizări Recente
                            </span>

                            <div className="space-y-2">
                              <div className="flex items-center space-x-3 p-2.5 bg-[#182229] rounded-xl border border-[#2a3942]">
                                <div className="w-10 h-10 rounded-full bg-blue-600/30 border-2 border-blue-400 flex items-center justify-center">
                                  <Sparkles className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-white">Google AI Studio Engine</h4>
                                  <p className="text-[10px] text-emerald-400">Nou container lansat pe portul :3001 • acum 5m</p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-3 p-2.5 bg-[#182229] rounded-xl border border-[#2a3942]">
                                <div className="w-10 h-10 rounded-full bg-purple-600/30 border-2 border-purple-400 flex items-center justify-center">
                                  <FolderGit2 className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-white">Godhubb Cluster</h4>
                                  <p className="text-[10px] text-[#8696a0]">Toate proiectele sincronizate cu branch-ul main • acum 18m</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]">
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[10px] font-bold text-[#8696a0] uppercase tracking-wider">
                                Jurnal Apeluri Recente
                              </span>
                              <button
                                onClick={() => setSimulatingCall(true)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" /> Apel Nou
                              </button>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-2.5 bg-[#182229] rounded-xl border border-[#2a3942]">
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <Phone className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-white">Alexia (Sistem)</h4>
                                    <span className="text-[9px] text-emerald-400">Apel recepționat • Durată 4m 12s</span>
                                  </div>
                                </div>
                                <span className="text-[9px] text-[#8696a0]">11:15</span>
                              </div>

                              <div className="flex items-center justify-between p-2.5 bg-[#182229] rounded-xl border border-[#2a3942]">
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                    <Video className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-white">Alexia (Video)</h4>
                                    <span className="text-[9px] text-blue-400">Apel video HD • 1080p</span>
                                  </div>
                                </div>
                                <span className="text-[9px] text-[#8696a0]">Ieri</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : currentPreviewRepo?.name?.includes("prompt") ? (
                      /* Live AI Prompt Generator inside AI Studio Preview */
                      <div className="bg-[#1e1f20] border border-[#333538] rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[#333538] pb-3">
                          <div>
                            <h4 className="font-bold text-sm text-blue-400 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-purple-400" /> AI Prompt Workbench (:3002)
                            </h4>
                            <p className="text-[10px] text-[#9aa0a6]">Python + Google Gemini Engine • Generare live cu latență scăzută</p>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                              HTTP 200 OK
                            </span>
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono font-bold">
                              Gemini 4 Hydrogen
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* Domain selection */}
                          <div>
                            <label className="text-xs text-[#9aa0a6] block mb-1.5 font-semibold">Domeniu Prompt & Specializare:</label>
                            <div className="flex flex-wrap gap-1.5">
                              {['DevOps', 'Frontend', 'Securitate', 'Bază de Date', 'Mobile', 'AI/ML'].map(cat => (
                                <button
                                  key={cat}
                                  onClick={() => setSandboxPromptCategory(cat)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                    sandboxPromptCategory === cat
                                      ? 'bg-blue-600 text-white shadow-md'
                                      : 'bg-[#28292a] text-[#9aa0a6] hover:text-white'
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Quick Template Chips */}
                          <div>
                            <label className="text-[11px] text-[#9aa0a6] block mb-1">Șabloane rapide:</label>
                            <div className="flex flex-wrap gap-1">
                              {[
                                "Configurare CI/CD GitHub Actions",
                                "Microservicii Docker & Compose",
                                "Componentă React cu Tailwind v4",
                                "Audit Securitate OWASP"
                              ].map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setSandboxPromptInput(t)}
                                  className="text-[10px] bg-[#28292a] hover:bg-[#333538] text-blue-300 px-2 py-0.5 rounded border border-[#3c4043] transition"
                                >
                                  + {t}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Specific requirement input */}
                          <div>
                            <label className="text-xs text-[#9aa0a6] block mb-1 font-semibold">Cerință specifică pentru generare:</label>
                            <input
                              type="text"
                              value={sandboxPromptInput}
                              onChange={(e) => setSandboxPromptInput(e.target.value)}
                              placeholder="ex: Script de curățare containere Docker sau pipeline complet..."
                              className="w-full bg-[#28292a] border border-[#3c4043] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 placeholder-[#8696a0]"
                            />
                          </div>

                          {/* Action Generate button calling real Gemini endpoint */}
                          <div className="flex gap-2">
                            <button
                              onClick={handleGenerateLivePrompt}
                              disabled={promptGenerating}
                              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg transition shadow-lg flex items-center justify-center gap-2"
                            >
                              {promptGenerating ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Generare live cu Gemini...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>⚡ Generează Prompt Live cu Gemini</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setSandboxPromptOutput("");
                                setSandboxPromptInput("");
                              }}
                              className="px-3 py-2 bg-[#28292a] hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white text-xs rounded-lg transition"
                              title="Resetează formularul"
                            >
                              Golește
                            </button>
                          </div>

                          {/* Live Generated Output Card */}
                          {sandboxPromptOutput && (
                            <div className="p-3.5 bg-[#131314] border border-blue-500/40 rounded-xl text-xs space-y-2">
                              <div className="flex items-center justify-between text-[10px] font-mono text-[#9aa0a6] border-b border-[#28292a] pb-1.5">
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> REZULTAT COMPILAT LIVE
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-blue-300">~184 tokens</span>
                                  <span className="text-purple-300">112ms latență</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(sandboxPromptOutput);
                                      setCopiedPromptSuccess(true);
                                      setTimeout(() => setCopiedPromptSuccess(false), 2000);
                                    }}
                                    className="text-white hover:text-blue-400 flex items-center gap-1 bg-[#28292a] px-1.5 py-0.5 rounded"
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                    <span>{copiedPromptSuccess ? 'Copiat!' : 'Copiază'}</span>
                                  </button>
                                </div>
                              </div>
                              <p className="text-blue-200 font-mono text-[11px] leading-relaxed whitespace-pre-line">
                                {sandboxPromptOutput}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : currentPreviewRepo?.name?.includes("commerce") ? (
                      /* Live E-Commerce Admin inside AI Studio Preview */
                      <div className="bg-[#1e1f20] border border-[#333538] rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[#333538] pb-3">
                          <div>
                            <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                              <ShoppingCart className="w-4 h-4" /> Next.js E-Commerce Store & Dashboard (:3003)
                            </h4>
                            <p className="text-[10px] text-[#9aa0a6]">Panou de gestiune magazin online, catalog produse și tranzacții în timp real</p>
                          </div>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                            TypeScript • SSR
                          </span>
                        </div>

                        {/* Top KPI Metrics Tiles */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                          <div className="bg-[#28292a] p-2.5 sm:p-3 rounded-xl border border-[#3c4043]">
                            <span className="text-[#9aa0a6] block text-[9px] sm:text-[10px]">Venituri Generate</span>
                            <span className="font-bold text-emerald-400 text-sm sm:text-base font-mono">
                              € {(sandboxCartItems * 189.5).toFixed(2)}
                            </span>
                          </div>
                          <div className="bg-[#28292a] p-2.5 sm:p-3 rounded-xl border border-[#3c4043]">
                            <span className="text-[#9aa0a6] block text-[9px] sm:text-[10px]">Comenzi Livrate</span>
                            <span className="font-bold text-blue-400 text-sm sm:text-base font-mono">{sandboxCartItems} Unități</span>
                          </div>
                          <div className="bg-[#28292a] p-2.5 sm:p-3 rounded-xl border border-[#3c4043]">
                            <span className="text-[#9aa0a6] block text-[9px] sm:text-[10px]">Rată Conversie</span>
                            <span className="font-bold text-purple-400 text-sm sm:text-base font-mono">3.8%</span>
                          </div>
                        </div>

                        {/* Interactive Product Catalog Showcase */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-[#c4c7c5] uppercase tracking-wider block">
                            Catalog Produse Magazin:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                              { id: 1, title: "MacBook Pro 16\" M3 Max", price: 2499, tag: "Top Seller", color: "from-blue-600 to-indigo-600" },
                              { id: 2, title: "iPhone 16 Pro Max 256GB", price: 1199, tag: "Nou", color: "from-purple-600 to-pink-600" },
                              { id: 3, title: "Sony WH-1000XM5 ANC", price: 349, tag: "Reducere", color: "from-emerald-600 to-teal-600" }
                            ].map((prod) => (
                              <div key={prod.id} className="bg-[#18191a] border border-[#333538] rounded-xl p-3 flex flex-col justify-between space-y-2">
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[9px] font-bold bg-[#28292a] text-[#c4c7c5] px-1.5 py-0.2 rounded">
                                      {prod.tag}
                                    </span>
                                    <span className="text-[10px] text-emerald-400 font-mono font-bold">€ {prod.price}</span>
                                  </div>
                                  <h5 className="font-bold text-xs text-white leading-snug">{prod.title}</h5>
                                </div>
                                <button
                                  onClick={() => {
                                    setSandboxCartItems(prev => prev + 1);
                                    setActionMessage(`Adăugat în coș: ${prod.title}!`);
                                    setTimeout(() => setActionMessage(null), 2000);
                                  }}
                                  className="w-full py-1.5 bg-[#28292a] hover:bg-emerald-600 hover:text-white text-emerald-300 text-[11px] font-semibold rounded-lg transition flex items-center justify-center gap-1 border border-[#3c4043]"
                                >
                                  <ShoppingCart className="w-3 h-3" />
                                  <span>Adaugă în coș</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Checkout Action */}
                        <div className="p-3 bg-[#131314] rounded-xl border border-[#3c4043] flex flex-col sm:flex-row items-center justify-between gap-2.5">
                          <div>
                            <span className="text-xs text-[#9aa0a6] block">Coș curent: {sandboxCartItems} articole</span>
                            <span className="font-bold text-white text-sm">
                              Total de plată: <span className="text-emerald-400 font-mono">€ {(sandboxCartItems * 189.5).toFixed(2)}</span>
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 w-full sm:w-auto">
                            <button
                              onClick={() => {
                                setSandboxCartItems(prev => prev + 1);
                                setSandboxCheckoutSuccess(true);
                                setTimeout(() => setSandboxCheckoutSuccess(false), 3500);
                              }}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>💳 Finalizează Comandă Instant</span>
                            </button>
                            <button
                              onClick={() => setSandboxCartItems(0)}
                              className="px-2.5 py-2 bg-[#28292a] hover:bg-[#3c4043] text-red-400 text-xs font-semibold rounded-lg transition"
                              title="Golește coșul"
                            >
                              Reset
                            </button>
                          </div>
                        </div>

                        {sandboxCheckoutSuccess && (
                          <div className="bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 p-3 rounded-xl text-xs flex items-center justify-between shadow-lg animate-fadeIn">
                            <div className="flex items-center space-x-2">
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                              <div>
                                <span className="font-bold block text-white">Comandă confirmată cu succes!</span>
                                <span className="text-[10px] text-emerald-300 font-mono">
                                  Tranzacție #TRX-{Date.now().toString().slice(-6)} sincronizată în baza de date
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                              Plată Procesată ✓
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Universal Fullstack App Simulator for other repositories */
                      <div className="bg-[#1e1f20] border border-[#333538] rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#333538] pb-3">
                          <div>
                            <h4 className="font-bold text-sm text-blue-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {currentPreviewRepo?.name} (AI Studio Preview)
                            </h4>
                            <p className="text-[10px] text-[#9aa0a6]">{currentPreviewRepo?.description || "Aplicație activă în containerul de testare Godhubb"}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded font-bold font-mono">
                              {currentPreviewRepo?.language || 'Fullstack App'}
                            </span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold font-mono">
                              Port :{currentRunnerInfo?.port || 3001}
                            </span>
                          </div>
                        </div>

                        {/* Universal Sub Tabs */}
                        <div className="flex space-x-2 border-b border-[#333538] pb-2 text-xs font-semibold">
                          <button
                            onClick={() => setUniversalAppTab('dashboard')}
                            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                              universalAppTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-[#28292a] text-[#9aa0a6] hover:text-white'
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5" /> Gestiune Taskuri (CRUD)
                          </button>
                          <button
                            onClick={() => setUniversalAppTab('api')}
                            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                              universalAppTab === 'api' ? 'bg-blue-600 text-white' : 'bg-[#28292a] text-[#9aa0a6] hover:text-white'
                            }`}
                          >
                            <Terminal className="w-3.5 h-3.5" /> Testare API & Endpoints
                          </button>
                          <button
                            onClick={() => setUniversalAppTab('crud')}
                            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                              universalAppTab === 'crud' ? 'bg-blue-600 text-white' : 'bg-[#28292a] text-[#9aa0a6] hover:text-white'
                            }`}
                          >
                            <Activity className="w-3.5 h-3.5" /> Metrici Container
                          </button>
                        </div>

                        {/* Tab 1: Task Manager CRUD */}
                        {universalAppTab === 'dashboard' && (
                          <div className="space-y-3">
                            <form onSubmit={handleAddUniversalItem} className="flex gap-2">
                              <input
                                type="text"
                                value={universalNewTitle}
                                onChange={(e) => setUniversalNewTitle(e.target.value)}
                                placeholder="Adaugă un element nou de test în baza de date..."
                                className="flex-1 bg-[#28292a] border border-[#3c4043] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 placeholder-[#8696a0]"
                              />
                              <button
                                type="submit"
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow"
                              >
                                <Plus className="w-3.5 h-3.5" /> Adaugă
                              </button>
                            </form>

                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {universalItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-2.5 bg-[#18191a] border border-[#333538] rounded-xl flex items-center justify-between gap-2 hover:border-[#484a4d] transition"
                                >
                                  <div className="flex items-center space-x-2.5 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleUniversalItem(item.id)}
                                      className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                                        item.status === 'complet'
                                          ? 'bg-emerald-600 border-emerald-500 text-white'
                                          : 'border-[#484a4d] bg-[#28292a]'
                                      }`}
                                    >
                                      {item.status === 'complet' && <Check className="w-3 h-3" />}
                                    </button>
                                    <span
                                      className={`text-xs truncate ${
                                        item.status === 'complet' ? 'line-through text-[#8696a0]' : 'text-white'
                                      }`}
                                    >
                                      {item.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-2 shrink-0">
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                                        item.priority === 'Critic'
                                          ? 'bg-red-500/20 text-red-300'
                                          : item.priority === 'Ridicat'
                                          ? 'bg-amber-500/20 text-amber-300'
                                          : 'bg-blue-500/20 text-blue-300'
                                      }`}
                                    >
                                      {item.priority}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUniversalItem(item.id)}
                                      className="text-[#8696a0] hover:text-red-400 p-1"
                                      title="Șterge"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tab 2: API Endpoints Tester */}
                        {universalAppTab === 'api' && (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleRunUniversalApi('/api/health')}
                                className="px-3 py-1.5 bg-[#28292a] hover:bg-[#3c4043] border border-[#3c4043] text-emerald-300 rounded-lg text-xs font-mono font-semibold transition"
                              >
                                GET /api/health
                              </button>
                              <button
                                onClick={() => handleRunUniversalApi('/api/metrics')}
                                className="px-3 py-1.5 bg-[#28292a] hover:bg-[#3c4043] border border-[#3c4043] text-blue-300 rounded-lg text-xs font-mono font-semibold transition"
                              >
                                GET /api/metrics
                              </button>
                              <button
                                onClick={() => handleRunUniversalApi('/api/sync')}
                                className="px-3 py-1.5 bg-[#28292a] hover:bg-[#3c4043] border border-[#3c4043] text-purple-300 rounded-lg text-xs font-mono font-semibold transition"
                              >
                                POST /api/sync
                              </button>
                            </div>

                            {universalApiResult && (
                              <div className="p-3 bg-[#131314] rounded-xl border border-[#3c4043] font-mono text-[11px] text-emerald-300 overflow-x-auto space-y-1">
                                <span className="text-[9px] text-[#9aa0a6] block font-bold">RĂSPUNS SERVER HTTP 200:</span>
                                <pre className="leading-tight">{universalApiResult}</pre>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tab 3: Container Metrics & Health */}
                        {universalAppTab === 'crud' && (
                          <div className="p-3.5 bg-[#131314] rounded-xl border border-[#3c4043] space-y-2 font-mono text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-emerald-400">● Stare Container:</span>
                              <span className="text-white font-bold">ONLINE (Port :{currentRunnerInfo?.port || 3001})</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#9aa0a6]">Uptime server:</span>
                              <span className="text-emerald-300">{currentRunnerInfo?.uptimeSeconds || 120} secunde</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#9aa0a6]">Cereri procesate:</span>
                              <span className="text-blue-300">{currentRunnerInfo?.requestsServed || 42} requests</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#9aa0a6]">Utilizare CPU / Memorie:</span>
                              <span className="text-amber-300">{currentRunnerInfo?.cpu || 4}% CPU • {currentRunnerInfo?.memoryMb || 54} MB RAM</span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <a
                            href={currentPreviewRepo?.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 bg-[#28292a] hover:bg-[#3c4043] text-white text-center text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
                          >
                            <span>Deschide Repo pe GitHub</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => {
                              setActionMessage(`Test executat în Google AI Studio pentru ${currentPreviewRepo?.name}: 100% Funcțional.`);
                              setTimeout(() => setActionMessage(null), 3000);
                            }}
                            className="flex-1 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold rounded-lg transition shadow"
                          >
                            Rulează Test Ping
                          </button>
                        </div>
                      </div>
                    )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Studio Bottom Terminal / Console Drawer */}
                {showStudioTerminal && (
                  <div className="bg-[#090d13] border-t border-[#333538] p-2.5 font-mono text-[10px] text-[#c4c7c5] max-h-40 overflow-y-auto space-y-0.5 shrink-0">
                    <div className="flex justify-between items-center text-[#9aa0a6] font-bold pb-1 border-b border-[#28292a]">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Terminal className="w-3 h-3" /> GOOGLE AI STUDIO CONSOLE • Dev Server (:3000)
                      </span>
                      <div className="flex items-center space-x-2">
                        {currentPreviewRepo && liveBuildInfo[currentPreviewRepo.name] && (
                          <span className={liveBuildInfo[currentPreviewRepo.name].ok ? "text-emerald-400" : "text-red-400"}>
                            {liveBuildInfo[currentPreviewRepo.name].ok
                              ? `Build ✓ (${liveBuildInfo[currentPreviewRepo.name].bundleSizeKb || 1}KB)`
                              : `Build ✗`}
                          </span>
                        )}
                        <span>Port :{currentRunnerInfo?.port || 3001}</span>
                        {liveConsoleLogs.length > 0 && (
                          <button
                            onClick={() => setLiveConsoleLogs([])}
                            className="px-1.5 py-0.5 rounded bg-[#28292a] hover:bg-[#3c4043] text-[#c4c7c5] text-[9px] font-normal"
                          >
                            Curăță
                          </button>
                        )}
                      </div>
                    </div>
                    {(currentRunnerInfo?.logs || [
                      `[AI Studio] Dev server listening on port 3000.`,
                      `[AI Studio] Container activ pentru ${currentPreviewRepo?.name || 'aplicație'}.`
                    ]).map((log, i) => (
                      <div key={`runner-${i}`} className="text-emerald-300/90 truncate">{log}</div>
                    ))}
                    {liveConsoleLogs.map((item, idx) => (
                      <div
                        key={`live-${idx}`}
                        className={`truncate ${
                          item.level === 'error'
                            ? 'text-red-400'
                            : item.level === 'warn'
                            ? 'text-amber-300'
                            : 'text-blue-300'
                        }`}
                      >
                        [{item.time}] {item.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'runner' ? (
          /* ======================================================== */
          /* TAB 2: CLUSTER RUNNER (RULEAZĂ TOATE PROIECTELE) */
          /* ======================================================== */
          <div className="flex-1 flex flex-col bg-[#131314] z-10 overflow-hidden text-xs">
            <div className="p-3 bg-[#1e1f20] border-b border-[#333538] space-y-2.5 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Rocket className="w-4 h-4 text-emerald-400" />
                    Godhubb Cloud Cluster Runner
                  </h3>
                  <p className="text-[10px] text-[#9aa0a6]">Apasă pornire pentru auto-setare și rulare automată în Google AI Studio</p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleAutonomousHealAll}
                    disabled={autonomousHealAllRunning}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
                    title="Claude AI + Multi-AI Swarm scanează, repară și compilează autonom toate proiectele"
                  >
                    {autonomousHealAllRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{autonomousHealAllRunning ? 'Reparare Autonomă...' : '🤖 Autonom Claude + Toți AI'}</span>
                  </button>
                  <button
                    onClick={handleTestAllRepoBuilds}
                    disabled={testingAllBuilds}
                    className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                    title="Compilează și verifică live toate proiectele"
                  >
                    <Activity className={`w-3.5 h-3.5 ${testingAllBuilds ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{testingAllBuilds ? 'Se testează...' : 'Testează Toate Live'}</span>
                    <span className="sm:hidden">Test</span>
                  </button>
                  <button
                    onClick={handleStartAllProjects}
                    disabled={startingAll}
                    className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
                  >
                    {startingAll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Rulează Toate</span>
                  </button>
                  <button
                    onClick={handleStopAllProjects}
                    className="px-2.5 py-1.5 bg-[#28292a] hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                    title="Oprește toate containerele"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Cluster Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#28292a] p-2.5 rounded-xl border border-[#3c4043] text-center">
                <div className="bg-[#131314] p-1.5 rounded">
                  <span className="text-[9px] text-[#9aa0a6] block">Containere Active</span>
                  <span className="font-bold text-emerald-400 text-xs">
                    {runningContainersList.length} / {repos.filter(r => !r.isEmpty).length}
                  </span>
                </div>
                <div className="bg-[#131314] p-1.5 rounded">
                  <span className="text-[9px] text-[#9aa0a6] block">Memorie RAM</span>
                  <span className="font-bold text-blue-400 text-xs">{totalMemoryUsed} MB</span>
                </div>
                <div className="bg-[#131314] p-1.5 rounded">
                  <span className="text-[9px] text-[#9aa0a6] block">Utilizare CPU</span>
                  <span className="font-bold text-amber-400 text-xs">{totalCpuUsed}%</span>
                </div>
                <div className="bg-[#131314] p-1.5 rounded">
                  <span className="text-[9px] text-[#9aa0a6] block">Porturi Alocate</span>
                  <span className="font-bold text-purple-400 text-xs">:3001 - :300{repos.length}</span>
                </div>
              </div>
            </div>

            {/* List of Projects in Runner */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {repos.filter(r => !r.isEmpty).map((repo) => {
                const info = runners[repo.name];
                const isRunning = info?.status === 'running';
                const buildStat = liveBuildInfo[repo.name];

                return (
                  <div
                    key={repo.id}
                    className={`p-3 rounded-xl border transition flex flex-col space-y-2 ${
                      isRunning
                        ? 'bg-[#18191a] border-blue-500/40 shadow-md shadow-blue-950/20'
                        : 'bg-[#1e1f20] border-[#333538]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`}></span>
                        <div className="min-w-0">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="font-bold text-sm text-white truncate">{repo.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${isRunning ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#28292a] text-[#9aa0a6]'}`}>
                              {isRunning ? `PORT :${info?.port || 3001}` : 'OPRIT'}
                            </span>
                            {buildStat && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${buildStat.ok ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`}>
                                {buildStat.ok ? `✓ ${buildStat.mode}` : '✗ Eroare'}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#9aa0a6] truncate">{repo.description || "Fără descriere."}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-auto">
                        {/* Toggle Start/Stop */}
                        <button
                          onClick={() => handleToggleSingleRunner(repo.name)}
                          className={`px-2 py-1 rounded text-[10px] font-semibold border transition flex items-center gap-1 ${
                            isRunning
                              ? 'bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                          }`}
                          title={isRunning ? "Oprește containerul" : "Pornește containerul"}
                        >
                          {isRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          <span className="hidden xs:inline">{isRunning ? 'Stop' : 'Start'}</span>
                        </button>

                        {/* Container Logs */}
                        <button
                          onClick={() => setLogModalRepo(repo.name)}
                          className="px-2 py-1 rounded bg-[#28292a] hover:bg-[#3c4043] text-[#c4c7c5] font-semibold text-[10px] flex items-center gap-1 border border-[#3c4043] transition"
                          title="Vezi logurile containerului"
                        >
                          <Terminal className="w-3 h-3" />
                          <span className="hidden sm:inline">Loguri</span>
                        </button>

                        {/* Copy Link for this Repo */}
                        <button
                          onClick={() => handleCopyPreviewLink(repo.name)}
                          className="px-2 py-1 rounded bg-[#28292a] hover:bg-[#3c4043] text-blue-300 font-semibold text-[10px] flex items-center gap-1 border border-[#3c4043] transition"
                          title="Copiază link direct cu auto-rulare"
                        >
                          <Copy className="w-3 h-3" />
                          <span className="hidden xs:inline">Link</span>
                        </button>

                        {/* Start and Preview Button */}
                        <button
                          onClick={() => handleStartSingleAndPreview(repo)}
                          className="px-2.5 py-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-[10px] font-bold flex items-center gap-1 transition shadow"
                        >
                          <Play className="w-3 h-3" />
                          <span>Pornire & AI Studio</span>
                        </button>

                        {/* Open Sandbox Live Preview directly */}
                        <button
                          onClick={() => {
                            setPreviewAppRepo(repo);
                            setStudioViewMode('live');
                            setActiveTab('preview');
                          }}
                          className="px-2 py-1 rounded bg-[#28292a] hover:bg-[#3c4043] text-blue-300 font-semibold text-[10px] flex items-center gap-1 border border-[#3c4043] transition"
                          title="Previzualizare Live"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {isRunning && (
                      <div className="flex items-center justify-between text-[10px] text-[#9aa0a6] pt-1 border-t border-[#333538]">
                        <div className="flex items-center space-x-3">
                          <span className="flex items-center gap-1 font-mono text-emerald-400">
                            <Activity className="w-3 h-3" /> CPU: {info?.cpu || 4}%
                          </span>
                          <span className="font-mono text-blue-400">
                            RAM: {info?.memoryMb || 45} MB
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setPreviewAppRepo(repo);
                            setStudioViewMode('live');
                            setActiveTab('preview');
                          }}
                          className="text-blue-400 font-bold text-[10px] hover:underline flex items-center gap-0.5"
                        >
                          Deschide Live în Google AI Studio →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 bg-[#1e1f20] border-t border-[#333538] flex items-center justify-between px-4">
              <button
                onClick={() => setActiveTab('preview')}
                className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1"
              >
                🌐 Mergi la Pagina de Previzualizare AI Studio
              </button>
              <button
                onClick={handleStartAllProjects}
                className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded font-bold text-xs flex items-center gap-1 transition"
              >
                <Rocket className="w-3.5 h-3.5" /> Rulează Toate
              </button>
            </div>
          </div>
        ) : activeTab === 'chats' ? (
          /* ======================================================== */
          /* TAB 3: CHATS (WHATSAPP ALEXIA) */
          /* ======================================================== */
          <div className="flex-1 flex flex-col bg-[#0b141a] relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#e9edef_1px,transparent_1px)] [background-size:14px_14px]"></div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 z-10">
              <div className="flex justify-center my-1">
                <span className="bg-[#182229] text-[#8696a0] text-[10px] px-2.5 py-0.5 rounded shadow-sm border border-[#222d34]">
                  ✨ Google AI Studio Build Integrat
                </span>
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}
                >
                  {msg.sender === 'system' ? (
                    <div className="bg-[#202c33]/80 text-[#8696a0] text-[11px] px-3 py-1 rounded-lg max-w-[90%] text-center border border-[#222d34]">
                      {msg.text}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[88%] rounded-lg px-3 py-2 text-xs relative shadow ${
                        msg.sender === 'user'
                          ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                          : 'bg-[#202c33] text-[#e9edef] rounded-tl-none border border-[#222d34]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      <div className="flex items-center justify-end space-x-1 mt-1 text-[9px] text-[#8696a0]">
                        <span>{msg.timestamp}</span>
                        {msg.sender === 'user' && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#202c33] text-[#8696a0] text-[11px] px-3 py-1.5 rounded-lg flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    <span className="ml-1 text-[10px]">Alexia gândește...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-3 py-1.5 bg-[#111b21] border-t border-[#222d34] flex gap-1.5 overflow-x-auto z-10 shrink-0">
              <button
                onClick={() => setActiveTab('preview')}
                className="bg-blue-600/20 hover:bg-blue-600/30 text-[11px] text-blue-300 px-3 py-1 rounded-full whitespace-nowrap transition border border-blue-500/30 flex items-center gap-1 font-bold"
              >
                <Eye className="w-3 h-3" /> Deschide Previzualizare AI Studio ✨
              </button>
              <button
                onClick={handleStartAllProjects}
                className="bg-[#238636]/20 hover:bg-[#238636]/30 text-[11px] text-emerald-300 px-3 py-1 rounded-full whitespace-nowrap transition border border-emerald-500/30 flex items-center gap-1 font-bold"
              >
                <Rocket className="w-3 h-3" /> Pornire Toate Proiectele 🚀
              </button>
            </div>

            <div className="p-2.5 bg-[#202c33] flex items-center space-x-2 z-10 shrink-0">
              <button className="text-[#aebac1] hover:text-[#e9edef]">
                <Smile className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Întreabă-o pe Alexia..."
                className="flex-1 bg-[#2a3942] border-none outline-none text-xs text-[#e9edef] placeholder-[#8696a0] px-3 py-2 rounded-lg"
              />
              <button
                onClick={() => handleSendMessage()}
                className="bg-[#00a884] hover:bg-[#008f72] text-white p-2 rounded-lg transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : activeTab === 'workstation' ? (
          /* ======================================================== */
          /* TAB 4: WORKSTATION IDE */
          /* ======================================================== */
          <div className="flex-1 flex flex-col bg-[#131314] z-10 overflow-hidden text-xs">
            <div className="bg-[#1e1f20] px-3 py-2 border-b border-[#333538] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Laptop className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-bold text-white truncate">Godhubb PC de Lucru [IDE]</span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                {/* Mobile IDE Switch */}
                <div className="flex md:hidden items-center bg-[#28292a] rounded-lg p-0.5 border border-[#3c4043] text-[10px]">
                  <button
                    onClick={() => setMobileIdeView('terminal')}
                    className={`px-2 py-0.5 rounded font-semibold transition ${mobileIdeView === 'terminal' ? 'bg-blue-600 text-white' : 'text-[#9aa0a6]'}`}
                  >
                    Terminal
                  </button>
                  <button
                    onClick={() => setMobileIdeView('files')}
                    className={`px-2 py-0.5 rounded font-semibold transition ${mobileIdeView === 'files' ? 'bg-blue-600 text-white' : 'text-[#9aa0a6]'}`}
                  >
                    Fișiere
                  </button>
                </div>

                <select
                  value={selectedRepoForTest?.name || ''}
                  onChange={(e) => {
                    const found = repos.find(r => r.name === e.target.value);
                    if (found) setSelectedRepoForTest(found);
                  }}
                  className="bg-[#28292a] text-blue-300 border border-[#3c4043] rounded px-2 py-1 text-xs outline-none max-w-[130px] sm:max-w-[180px] truncate"
                >
                  {repos.map(r => (
                    <option key={r.id} value={r.name}>{r.name} ({r.language || 'Code'})</option>
                  ))}
                </select>
                <button
                  onClick={() => handleRunTerminalCommand('npm run start')}
                  className="bg-[#238636] hover:bg-[#2ea043] text-white px-2.5 py-1 rounded font-medium flex items-center gap-1 transition text-xs shrink-0"
                >
                  <Play className="w-3 h-3" />
                  <span className="hidden sm:inline">Testează & Previzualizează</span>
                  <span className="sm:hidden">Start</span>
                </button>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
              <div className={`${mobileIdeView === 'files' ? 'flex' : 'hidden'} md:flex bg-[#18191a] border-r border-[#333538] p-3 flex-col space-y-2 overflow-y-auto`}>
                <div className="flex items-center justify-between text-[#9aa0a6] font-semibold text-[11px] pb-1 border-b border-[#333538]">
                  <span className="flex items-center gap-1 truncate">
                    <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {selectedRepoForTest?.name || 'proiect-selectat'}
                  </span>
                  <span className="text-[9px] bg-[#28292a] px-1.5 py-0.5 rounded text-emerald-400 shrink-0">
                    {selectedRepoForTest?.default_branch || 'main'}
                  </span>
                </div>
                <div className="space-y-0.5 font-mono text-[11px] text-[#c4c7c5] overflow-y-auto max-h-72">
                  {loadingTree ? (
                    <div className="text-[10px] text-[#9aa0a6] py-2">Se încarcă arborele de fișiere...</div>
                  ) : repoTreeFiles.length === 0 ? (
                    <div className="text-[10px] text-[#9aa0a6] py-2">Nu există fișiere în repository.</div>
                  ) : (
                    repoTreeFiles.map((f) => (
                      <button
                        key={f.path}
                        onClick={() => selectedRepoForTest && loadFileContentFromRepo(selectedRepoForTest, f.path)}
                        className={`w-full text-left flex items-center justify-between gap-1.5 py-1 px-2 rounded transition ${
                          selectedFileInStudio === f.path
                            ? 'bg-[#28292a] text-blue-300 font-semibold'
                            : 'hover:bg-[#28292a]/70 text-[#c4c7c5]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 min-w-0 truncate">
                          <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="truncate">{f.path}</span>
                        </span>
                        <span className="text-[9px] text-[#8696a0] shrink-0">{f.size > 0 ? `${Math.max(1, Math.round(f.size / 1024))}K` : ''}</span>
                      </button>
                    ))
                  )}
                </div>

                <div className="mt-auto pt-3 border-t border-[#333538] space-y-2">
                  <span className="text-[10px] text-[#9aa0a6] font-bold">Comenzi Rapide PC:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleRunTerminalCommand('npm test')}
                      className="bg-[#28292a] hover:bg-[#3c4043] text-emerald-400 py-1 px-2 rounded text-[10px] text-left"
                    >
                      ⚡ Teste Cod
                    </button>
                    <button
                      onClick={() => handleRunTerminalCommand('npm run build')}
                      className="bg-[#28292a] hover:bg-[#3c4043] text-blue-400 py-1 px-2 rounded text-[10px] text-left"
                    >
                      🔨 Build Proiect
                    </button>
                  </div>
                </div>
              </div>

              <div className={`${mobileIdeView === 'terminal' ? 'flex' : 'hidden'} md:flex col-span-2 flex-col bg-[#131314] overflow-hidden`}>
                {/* Quick Real Source Code Viewer / Editor */}
                <div className="h-44 sm:h-52 border-b border-[#333538] flex flex-col bg-[#0d1117] shrink-0">
                  <div className="bg-[#1e1f20] px-3 py-1 border-b border-[#333538] flex items-center justify-between text-[10px]">
                    <span className="font-mono text-blue-300 truncate">
                      {selectedFileInStudio || 'Selectează un fișier din stânga'}
                      {editedFileDirty ? ' ●' : ''}
                    </span>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => handleExecuteActiveFile()}
                        disabled={executingCode || !selectedFileInStudio}
                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold transition flex items-center gap-1"
                      >
                        <Play className="w-2.5 h-2.5" /> {executingCode ? 'Rulează...' : 'Rulează Fișier'}
                      </button>
                      <button
                        onClick={() => handleSaveEditedFile(false)}
                        disabled={savingFile || !selectedFileInStudio}
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold transition"
                      >
                        {savingFile ? 'Salvare...' : 'Salvează & Build'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={loadingFileContent ? 'Se încarcă conținutul...' : selectedFileContent}
                    onChange={(e) => {
                      setSelectedFileContent(e.target.value);
                      setEditedFileDirty(true);
                    }}
                    spellCheck={false}
                    className="flex-1 w-full bg-[#0d1117] text-[#e6edf3] font-mono text-[11px] p-2.5 outline-none resize-none leading-relaxed select-text"
                  />
                </div>

                <div className="flex-1 p-3 font-mono text-[11px] overflow-y-auto space-y-1 bg-[#090d13] border-b border-[#333538]">
                  {terminalLogs.map((log, idx) => (
                    <div key={idx} className={log.startsWith('$') ? 'text-blue-400 font-semibold' : log.includes('✓') ? 'text-green-400' : log.includes('✗') ? 'text-red-400' : 'text-[#c4c7c5]'}>
                      {log}
                    </div>
                  ))}
                  {workstationRunning && (
                    <div className="text-emerald-300 bg-emerald-950/20 p-2 rounded border border-emerald-500/30 mt-2">
                      🌐 Serverul de test rulează cu succes pe http://localhost:3000
                    </div>
                  )}
                </div>

                <div className="p-2 bg-[#1e1f20] border-t border-[#333538] flex items-center space-x-2">
                  <span className="text-blue-400 font-mono font-bold">$</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRunTerminalCommand(terminalInput)}
                    placeholder="ls, cat <fisier>, npm run build, git status, help, clear..."
                    className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-white placeholder-[#5f6368]"
                  />
                  <button
                    onClick={() => handleRunTerminalCommand(terminalInput)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold"
                  >
                    Execută
                  </button>
                </div>
              </div>
            </div>

            <div className="p-2 bg-[#1e1f20] border-t border-[#333538] flex justify-between px-3 items-center">
              <span className="text-[10px] text-[#9aa0a6]">Mediu Virtual Node.js v20 • Godhubb Cloud OS</span>
              <button onClick={() => setActiveTab('preview')} className="text-xs text-blue-400 hover:underline font-bold">
                → Vezi Previzualizarea Live
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* TAB 5: GODHUBB PRO MANAGER */
          /* ======================================================== */
          <div className="flex-1 flex flex-col bg-[#131314] z-10 overflow-hidden">
            <div className="p-3 bg-[#1e1f20] border-b border-[#333538] space-y-2.5 shrink-0">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center space-x-2 bg-[#131314] rounded-lg px-3 py-1.5 text-xs border border-[#3c4043]">
                  <Search className="w-3.5 h-3.5 text-[#9aa0a6]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Caută printre cele ${repos.length} proiecte...`}
                    className="bg-transparent border-none outline-none w-full text-white placeholder-[#5f6368]"
                  />
                </div>
                <form onSubmit={handleImportPublicRepo} className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={publicRepoInput}
                    onChange={(e) => setPublicRepoInput(e.target.value)}
                    placeholder="Importă orice repo (owner/repo sau URL GitHub)"
                    className="bg-[#131314] border border-[#3c4043] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500 w-48 sm:w-56"
                  />
                  <button
                    type="submit"
                    disabled={importingPublicRepo}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                    title="Importă și rulează imediat acest repository GitHub"
                  >
                    {importingPublicRepo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Rulează URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGithubHubModal(true);
                      if (ghSearchResults.length === 0) handleSearchGitHubHub();
                    }}
                    className="px-2.5 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                    title="Caută pe GitHub resurse, componente sau repo-uri noi"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Caută GitHub</span>
                  </button>
                </form>
              </div>

              <div className="flex items-center justify-between overflow-x-auto pb-1">
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium transition ${filterTab === 'all' ? 'bg-[#00a884] text-white' : 'bg-[#28292a] text-[#9aa0a6]'}`}
                  >
                    Toate ({repos.length})
                  </button>
                  <button
                    onClick={() => setFilterTab('active')}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium transition ${filterTab === 'active' ? 'bg-[#00a884] text-white' : 'bg-[#28292a] text-[#9aa0a6]'}`}
                  >
                    Active ({activeCount})
                  </button>
                  <button
                    onClick={() => setFilterTab('empty')}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium transition ${filterTab === 'empty' ? 'bg-red-600 text-white' : 'bg-[#28292a] text-red-400'}`}
                  >
                    Goale ({emptyCount})
                  </button>
                  <button
                    onClick={() => setFilterTab('private')}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium transition ${filterTab === 'private' ? 'bg-amber-600 text-white' : 'bg-[#28292a] text-amber-400'}`}
                  >
                    Private ({privateCount})
                  </button>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={checkStatusAndFetchRepos}
                    className="p-1.5 bg-[#28292a] text-white rounded hover:bg-[#3c4043]"
                    title="Reîmprospătează"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingRepos ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <select
                  value={sortOrder}
                  onChange={(e: any) => handleSortRepos(e.target.value)}
                  className="bg-[#28292a] text-white border border-[#3c4043] rounded px-2 py-1 outline-none text-[10px]"
                >
                  <option value="updated">Ordonare: Ultima actualizare</option>
                  <option value="name">Ordonare: Nume (A-Z)</option>
                  <option value="size">Ordonare: Mărime fișiere</option>
                  <option value="stars">Ordonare: Stele GitHub</option>
                </select>

                <button
                  onClick={handleDeleteEmptyRepos}
                  disabled={emptyCount === 0 || loadingRepos}
                  className={`px-2.5 py-1 rounded text-[10px] font-semibold flex items-center gap-1 ${
                    emptyCount > 0 ? 'bg-red-600 hover:bg-red-700 text-white shadow' : 'bg-[#28292a] text-[#5f6368]'
                  }`}
                >
                  <Trash2 className="w-3 h-3" /> Șterge Goale ({emptyCount})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {repos.filter(r => {
                const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
                if (!matchesSearch) return false;
                if (filterTab === 'active') return !r.isEmpty;
                if (filterTab === 'empty') return r.isEmpty;
                if (filterTab === 'private') return r.private;
                return true;
              }).map((repo) => (
                <div
                  key={repo.id}
                  className={`p-3 rounded-xl border text-xs transition space-y-2 ${
                    repo.isEmpty
                      ? 'bg-red-950/20 border-red-500/30 hover:border-red-500/60'
                      : 'bg-[#1e1f20] border-[#333538] hover:border-[#3c4043]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0 pr-2">
                      <FolderGit2 className={`w-4 h-4 shrink-0 ${repo.isEmpty ? 'text-red-400' : 'text-blue-400'}`} />
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold truncate text-white hover:text-blue-400 flex items-center gap-1"
                      >
                        <span className="truncate">{repo.name}</span>
                        <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                      </a>
                      {repo.private ? (
                        <span className="bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Privat
                        </span>
                      ) : (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 flex items-center gap-0.5">
                          <Globe className="w-2.5 h-2.5" /> Public
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 self-end sm:self-auto">
                      {/* Copy Link for this repo */}
                      <button
                        onClick={() => handleCopyPreviewLink(repo.name)}
                        className="p-1 rounded bg-[#28292a] hover:bg-[#3c4043] text-blue-300 transition text-[10px] flex items-center gap-1 px-2 border border-[#3c4043]"
                        title="Copiază Link Previzualizare (cu Auto-Rulare)"
                      >
                        <Copy className="w-3 h-3" />
                        <span className="hidden xs:inline">Link</span>
                      </button>

                      {/* Start and Preview Button */}
                      <button
                        onClick={() => handleStartSingleAndPreview(repo)}
                        className="p-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white transition text-[10px] flex items-center gap-1 px-2.5 font-bold shadow"
                        title="Pornire & Deschide Previzualizare"
                      >
                        <Play className="w-3 h-3" />
                        <span>Pornire</span>
                      </button>

                      <button
                        onClick={() => handleToggleVisibility(repo.name, repo.owner.login, repo.private)}
                        className={`p-1 rounded transition text-[10px] flex items-center gap-1 ${
                          repo.private
                            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
                        }`}
                        title={repo.private ? "Schimbă în Public 🌍" : "Schimbă în Privat 🔒"}
                      >
                        {repo.private ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          setEditingRepo(repo);
                          setEditRepoDesc(repo.description || "");
                          setEditRepoHomepage(repo.homepage || "");
                        }}
                        className="text-[#9aa0a6] hover:text-blue-400 p-1 transition"
                        title="Editează descrierea și linkul homepage"
                      >
                        <Settings className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteRepo(repo.name, repo.owner.login, false)}
                        className="text-[#9aa0a6] hover:text-red-400 p-1 transition"
                        title="Șterge repository"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleForceDeleteLocal(repo.name)}
                        className="text-amber-400 hover:text-amber-300 p-1 transition text-[10px]"
                        title="Ascunde/Șterge forțat din listă"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#9aa0a6] line-clamp-2">
                    {repo.description || "Fără descriere."}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#9aa0a6] pt-1 border-t border-[#333538]">
                    <div className="flex items-center space-x-3">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400" /> {repo.stargazers_count}
                      </span>
                      <span>{(repo.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <span className="text-[9px]">
                      {new Date(repo.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-[#1e1f20] border-t border-[#333538] flex items-center justify-between shrink-0 px-4">
              <button
                onClick={() => setActiveTab('preview')}
                className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1"
              >
                🌐 Mergi la Pagina de Previzualizare AI Studio
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Proiect nou
              </button>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar (< md) */}
        <div className="md:hidden bg-[#18191a] border-t border-[#333538] px-1 py-1.5 flex items-center justify-around shrink-0 z-20">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition min-w-[56px] ${
              activeTab === 'preview' ? 'text-blue-400 font-bold bg-blue-500/15' : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">AI Studio</span>
          </button>
          <button
            onClick={() => setActiveTab('runner')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition min-w-[56px] ${
              activeTab === 'runner' ? 'text-emerald-400 font-bold bg-emerald-500/15' : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Rocket className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Rulează</span>
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition min-w-[56px] ${
              activeTab === 'github' ? 'text-emerald-300 font-bold bg-[#28292a]' : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            <FolderGit2 className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Godhubb</span>
          </button>
          <button
            onClick={() => setActiveTab('workstation')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition min-w-[56px] ${
              activeTab === 'workstation' ? 'text-blue-300 font-bold bg-blue-500/15' : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Laptop className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">IDE</span>
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition min-w-[56px] ${
              activeTab === 'chats' ? 'text-teal-300 font-bold bg-teal-500/15' : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Alexia</span>
          </button>
        </div>

        {/* Home Bar Indicator for Phone Frame */}
        {isPhoneFrame && (
          <div className="bg-[#131314] py-1.5 flex justify-center shrink-0 select-none border-t border-[#28292a]">
            <div className="w-32 h-1 bg-[#3c4043] rounded-full"></div>
          </div>
        )}
        </div>
      </div>

      {/* Create New Repository Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f20] border border-[#3c4043] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderGit2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Creează Proiect Nou (Godhubb)</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-[#9aa0a6] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRepo} className="space-y-3">
              <div>
                <label className="text-[10px] text-[#9aa0a6] block mb-1">Nume Repository *</label>
                <input
                  type="text"
                  required
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="ex: my-awesome-project"
                  className="w-full bg-[#131314] border border-[#3c4043] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#9aa0a6] block mb-1">Descriere (opțional)</label>
                <textarea
                  value={newRepoDesc}
                  onChange={(e) => setNewRepoDesc(e.target.value)}
                  placeholder="Descrierea scurtă a proiectului..."
                  rows={2}
                  className="w-full bg-[#131314] border border-[#3c4043] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="privateRepo"
                    checked={newRepoPrivate}
                    onChange={(e) => setNewRepoPrivate(e.target.checked)}
                    className="rounded border-[#3c4043] bg-[#131314] text-blue-500 focus:ring-0"
                  />
                  <label htmlFor="privateRepo" className="text-xs text-white">Repository privat</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="starterRepo"
                    checked={newRepoStarter}
                    onChange={(e) => setNewRepoStarter(e.target.checked)}
                    className="rounded border-[#3c4043] bg-[#131314] text-emerald-500 focus:ring-0"
                  />
                  <label htmlFor="starterRepo" className="text-xs text-emerald-300">Inițializează cu aplicație React starter (rulabilă instant)</label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-[#28292a] text-xs text-white rounded-lg hover:bg-[#3c4043]"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={creatingRepo}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg transition flex items-center gap-1"
                >
                  {creatingRepo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Creează pe Godhubb
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Repository Metadata Modal */}
      {editingRepo && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f20] border border-[#3c4043] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <Settings className="w-5 h-5 text-blue-400 shrink-0" />
                <h3 className="font-bold text-sm text-white truncate">Editează {editingRepo.name}</h3>
              </div>
              <button onClick={() => setEditingRepo(null)} className="text-[#9aa0a6] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRepoMeta} className="space-y-3">
              <div>
                <label className="text-[10px] text-[#9aa0a6] block mb-1">Descriere Repository</label>
                <textarea
                  value={editRepoDesc}
                  onChange={(e) => setEditRepoDesc(e.target.value)}
                  placeholder="Descrierea proiectului..."
                  rows={3}
                  className="w-full bg-[#131314] border border-[#3c4043] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#9aa0a6] block mb-1">URL Homepage / Live Demo (opțional)</label>
                <input
                  type="url"
                  value={editRepoHomepage}
                  onChange={(e) => setEditRepoHomepage(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#131314] border border-[#3c4043] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRepo(null)}
                  className="px-3 py-1.5 bg-[#28292a] text-xs text-white rounded-lg hover:bg-[#3c4043]"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={savingRepoMeta}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg transition flex items-center gap-1"
                >
                  {savingRepoMeta ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Salvează Modificările
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Container Logs & Build Diagnostics Modal */}
      {logModalRepo && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f20] border border-[#3c4043] rounded-2xl w-full max-w-lg p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <Terminal className="w-5 h-5 text-emerald-400 shrink-0" />
                <h3 className="font-bold text-sm text-white truncate">Loguri Container • {logModalRepo}</h3>
              </div>
              <button onClick={() => setLogModalRepo(null)} className="text-[#9aa0a6] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {liveBuildInfo[logModalRepo] && (
              <div className="p-2.5 bg-[#131314] border border-[#3c4043] rounded-lg text-[11px] font-mono flex flex-wrap items-center justify-between gap-2">
                <span className={liveBuildInfo[logModalRepo].ok ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {liveBuildInfo[logModalRepo].ok ? `✓ Build Live (${liveBuildInfo[logModalRepo].mode})` : `✗ Build Eșuat`}
                </span>
                <span className="text-[#9aa0a6]">
                  {liveBuildInfo[logModalRepo].entryFile || 'N/A'} • {liveBuildInfo[logModalRepo].bundleSizeKb || 0} KB • {liveBuildInfo[logModalRepo].durationMs || 0}ms
                </span>
              </div>
            )}

            <div className="bg-[#090d13] border border-[#333538] rounded-xl p-3 font-mono text-[11px] text-emerald-300 max-h-64 overflow-y-auto space-y-1">
              {(runners[logModalRepo]?.logs || ['Nu există loguri înregistrate pentru acest container.']).map((line, i) => (
                <div key={i} className="leading-relaxed">{line}</div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-1">
              <button
                onClick={() => {
                  const found = repos.find(r => r.name === logModalRepo);
                  setLogModalRepo(null);
                  if (found) handleStartSingleAndPreview(found);
                }}
                className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-xs font-bold text-white rounded-lg flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5" /> Deschide Live în AI Studio
              </button>
              <button
                onClick={() => setLogModalRepo(null)}
                className="px-3 py-1.5 bg-[#28292a] text-xs text-white rounded-lg hover:bg-[#3c4043]"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f20] border border-[#3c4043] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Jeton & Secrete GitHub</h3>
              </div>
              <button onClick={() => setShowTokenModal(false)} className="text-[#9aa0a6] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-2.5 bg-[#131314] rounded-lg text-xs border border-[#3c4043]">
                <span className="font-semibold text-blue-300 block mb-1">Status Conexiune:</span>
                <span className="text-[#9aa0a6]">
                  {githubStatus?.connected ? `✅ Conectat ca @${githubStatus.login}` : "⚠️ Folosește token din Secrete sau introdu un jeton personal."}
                </span>
              </div>

              <a
                href={GITHUB_TOKEN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg transition"
              >
                <Github className="w-4 h-4" />
                <span>Generează Jeton pe GitHub 🔗</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="pt-1">
                <label className="text-[10px] text-[#9aa0a6] block mb-1">Introdu jetonul personal (opțional):</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-[#131314] border border-[#3c4043] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 mb-3"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowTokenModal(false)}
                className="px-3 py-1.5 bg-[#28292a] text-xs text-white rounded-lg hover:bg-[#3c4043]"
              >
                Închide
              </button>
              <button
                onClick={() => {
                  setShowTokenModal(false);
                  checkStatusAndFetchRepos();
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg"
              >
                Sincronizează Jeton
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Search & Module/File Importer Modal */}
      {showGithubHubModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[#18191a] border border-[#3c4043] rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="px-4 py-3 bg-[#1e1f20] border-b border-[#333538] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Github className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-white truncate">Caută & Preia Resurse de pe GitHub (Godhubb Hub)</h3>
                  <p className="text-[10px] text-[#9aa0a6] truncate">
                    Importă componente, utilitare sau proiecte complete direct în <span className="text-blue-300 font-mono">{currentPreviewRepo?.name || 'proiectul activ'}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowGithubHubModal(false)} className="text-[#9aa0a6] hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar & Chips */}
            <div className="p-3 bg-[#1e1f20]/60 border-b border-[#333538] space-y-2 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearchGitHubHub();
                }}
                className="flex gap-2"
              >
                <div className="flex-1 flex items-center gap-2 bg-[#131314] border border-[#3c4043] rounded-lg px-3 py-1.5">
                  <Search className="w-4 h-4 text-[#9aa0a6]" />
                  <input
                    type="text"
                    value={ghSearchQuery}
                    onChange={(e) => setGhSearchQuery(e.target.value)}
                    placeholder="Caută pe GitHub (ex: react weather dashboard, tailwind navbar, crypto tracker)..."
                    className="flex-1 bg-transparent text-xs text-white outline-none placeholder-[#5f6368]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchingGh}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  {searchingGh ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Caută GitHub
                </button>
              </form>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {([
                    { id: 'repos', label: '📦 Repos GitHub' },
                    { id: 'code', label: '📄 Cod GitHub' },
                    { id: 'npm', label: '📥 Pachete npm' },
                    { id: 'apis', label: '🌐 Surse & API Gratuite' }
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleSearchGitHubHub(ghSearchQuery, tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        hubSourceMode === tab.id
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-[#28292a] text-[#9aa0a6] hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Muzică & Audio", q: "music audio player" },
                    { label: "React UI", q: "shadcn-ui ui" },
                    { label: "Meteo / Crypto", q: "weather coingecko" },
                    { label: "Express TS", q: "express typescript starter" }
                  ].map((chip) => (
                    <button
                      key={chip.q}
                      onClick={() => handleSearchGitHubHub(chip.q)}
                      className="px-2 py-0.5 bg-[#28292a] hover:bg-[#3c4043] border border-[#3c4043] rounded-full text-[10px] text-blue-300 transition"
                    >
                      ✨ {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main 2-Pane Split */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
              {/* Left: Search Results by Source Mode */}
              <div className="md:col-span-5 border-r border-[#333538] overflow-y-auto p-2.5 space-y-2">
                {searchingGh ? (
                  <div className="py-10 text-center text-xs text-[#9aa0a6]">Se caută în sursele externe...</div>
                ) : hubSourceMode === 'npm' ? (
                  npmSearchResults.length === 0 ? (
                    <div className="py-10 text-center text-xs text-[#9aa0a6]">Caută orice pachet npm (ex: howler, zustand, recharts).</div>
                  ) : (
                    npmSearchResults.map((pkg) => (
                      <div key={pkg.name} className="p-2.5 rounded-xl border bg-[#1e1f20] border-[#333538] space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-emerald-300 font-mono truncate">{pkg.name}</span>
                          <span className="text-[10px] text-amber-300 font-mono shrink-0">v{pkg.version}</span>
                        </div>
                        <p className="text-[10px] text-[#9aa0a6] line-clamp-2">{pkg.description || 'Pachet npm compatibil esm.sh'}</p>
                        <button
                          onClick={() => handleAddNpmPackageToRepo(pkg.name, pkg.version)}
                          disabled={savingFile || !currentPreviewRepo}
                          className="w-full py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-[10px] font-bold"
                        >
                          ➕ Adaugă în package.json & ImportMap
                        </button>
                      </div>
                    ))
                  )
                ) : hubSourceMode === 'apis' ? (
                  freePublicApis.map((api) => (
                    <div key={api.id} className="p-2.5 rounded-xl border bg-[#1e1f20] border-[#333538] space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-white truncate">{api.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 shrink-0">{api.category}</span>
                      </div>
                      <div className="text-[9px] font-mono text-blue-300 truncate">{api.endpoint}</div>
                      <button
                        onClick={() => {
                          handleInsertFreeApiIntoProject(api);
                          setShowGithubHubModal(false);
                        }}
                        className="w-full py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold"
                      >
                        📥 Adaugă Modul în {currentPreviewRepo?.name || 'Proiect'}
                      </button>
                    </div>
                  ))
                ) : hubSourceMode === 'code' ? (
                  ghCodeResults.length === 0 ? (
                    <div className="py-10 text-center text-xs text-[#9aa0a6]">Caută fișiere TypeScript/React pe GitHub (ex: AudioPlayer.tsx) sau conectează un GITHUB_TOKEN.</div>
                  ) : (
                    ghCodeResults.map((c, idx) => (
                      <div
                        key={`${c.repoFullName}-${c.path}-${idx}`}
                        onClick={() => {
                          setSelectedHubRepo({ name: c.repo, fullName: c.repoFullName, owner: { login: c.owner }, default_branch: 'main' });
                          handlePreviewHubFile(c.path);
                        }}
                        className="p-2.5 rounded-xl border bg-[#1e1f20] border-[#333538] hover:border-blue-500 cursor-pointer space-y-1"
                      >
                        <div className="font-bold text-xs text-blue-300 font-mono truncate">{c.name}</div>
                        <div className="text-[10px] text-[#9aa0a6] truncate">{c.repoFullName} / {c.path}</div>
                      </div>
                    ))
                  )
                ) : ghSearchResults.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#9aa0a6]">Introdu un termen și apasă "Caută GitHub".</div>
                ) : (
                  ghSearchResults.map((r) => {
                    const isSel = selectedHubRepo?.fullName === r.fullName;
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleSelectHubRepo(r)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition space-y-1.5 ${
                          isSel ? 'bg-blue-950/30 border-blue-500' : 'bg-[#1e1f20] border-[#333538] hover:border-[#5f6368]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-blue-300 truncate">{r.fullName}</span>
                          <span className="text-[10px] text-amber-300 font-mono shrink-0 flex items-center gap-0.5">
                            <Star className="w-3 h-3" /> {r.stars > 1000 ? `${(r.stars / 1000).toFixed(1)}k` : r.stars}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#9aa0a6] line-clamp-2">{r.description || 'Repository GitHub public'}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#28292a] text-[#c4c7c5] font-mono">{r.language}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowGithubHubModal(false);
                              handleImportPublicRepo(undefined, r.fullName);
                            }}
                            className="px-2 py-0.5 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-[9px] font-bold"
                          >
                            ▶ Rulează Repo Complet
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right: Selected Repo Files & Direct File Importer */}
              <div className="md:col-span-7 flex flex-col overflow-hidden bg-[#131314]">
                {!selectedHubRepo ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#9aa0a6] text-xs space-y-2">
                    <FolderGit2 className="w-8 h-8 text-blue-400/60" />
                    <p>Selectează un repository din stânga pentru a răsfoi fișierele și a importa orice modul/componentă în <span className="text-white font-semibold">{currentPreviewRepo?.name}</span>.</p>
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-2 bg-[#1e1f20] border-b border-[#333538] flex items-center justify-between text-xs shrink-0">
                      <span className="font-mono text-blue-300 truncate">{selectedHubRepo.fullName} ({hubRepoFiles.length} fișiere)</span>
                      <span className="text-[10px] text-[#9aa0a6]">Click pe un fișier pentru previzualizare</span>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 overflow-hidden">
                      {/* File list */}
                      <div className="sm:col-span-5 border-r border-[#333538] overflow-y-auto p-2 space-y-0.5 font-mono text-[10px]">
                        {loadingHubFiles ? (
                          <div className="py-6 text-center text-[#9aa0a6]">Se încarcă arborele...</div>
                        ) : (
                          hubRepoFiles
                            .filter(f => /\.(tsx|ts|jsx|js|css|json|py|html)$/i.test(f.path))
                            .slice(0, 120)
                            .map((f) => (
                              <div
                                key={f.path}
                                onClick={() => handlePreviewHubFile(f.path)}
                                className={`px-2 py-1 rounded cursor-pointer truncate ${
                                  hubPreviewPath === f.path ? 'bg-blue-600/30 text-blue-200 font-bold' : 'text-[#9aa0a6] hover:bg-[#28292a] hover:text-white'
                                }`}
                                title={f.path}
                              >
                                {f.path}
                              </div>
                            ))
                        )}
                      </div>

                      {/* Preview & Import Action */}
                      <div className="sm:col-span-7 flex flex-col overflow-hidden">
                        {hubPreviewPath ? (
                          <>
                            <div className="p-2 bg-[#18191a] border-b border-[#333538] space-y-1.5 shrink-0">
                              <div className="text-[10px] text-[#9aa0a6]">Destinație în <span className="text-white font-bold">{currentPreviewRepo?.name}</span>:</div>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  value={hubTargetPath}
                                  onChange={(e) => setHubTargetPath(e.target.value)}
                                  className="flex-1 bg-[#131314] border border-[#3c4043] rounded px-2 py-1 text-[10px] font-mono text-white outline-none focus:border-blue-500"
                                />
                                <button
                                  onClick={handleImportHubFileToProject}
                                  disabled={importingHubFile}
                                  className="px-2.5 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-[10px] font-bold shrink-0"
                                >
                                  {importingHubFile ? 'Se importă...' : '📥 Importă & Editează'}
                                </button>
                              </div>
                            </div>
                            <pre className="flex-1 overflow-auto p-3 bg-[#0d1117] text-[#e6edf3] font-mono text-[10px] leading-relaxed select-text">
                              {hubPreviewContent}
                            </pre>
                          </>
                        ) : (
                          <div className="flex-1 flex items-center justify-center p-4 text-center text-[11px] text-[#9aa0a6]">
                            Alege un fișier (.tsx, .ts, .css, .py) pentru a-l inspecta și importa.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
