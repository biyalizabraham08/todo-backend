import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import CalendarPicker from '../components/CalendarPicker';
import MobileBottomNav from '../components/MobileBottomNav';
import UpgradeModal from '../components/UpgradeModal';
import {
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiCheck,
  FiX,
  FiSearch,
  FiCheckCircle,
  FiPaperclip,
  FiList,
  FiClock,
  FiPercent,
  FiCalendar
} from 'react-icons/fi';

const Dashboard = () => {
  const { token, user } = useContext(AuthContext);
  const [todos, setTodos] = useState([]);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDueDate, setEditingDueDate] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFilterCalendar, setShowFilterCalendar] = useState(false);
  const [filterDate, setFilterDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const newTodoInputRef = useRef(null);

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      const storedToken = token || localStorage.getItem('token');
      const response = await api.get('/todos', {
        headers: storedToken ? { 'x-auth-token': storedToken } : {}
      });
      setTodos(response.data);
    } catch (error) {
      console.error('fetchTodos error:', error?.response?.status, error?.response?.data);
      toast.error(error?.response?.data || 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchTodos();
  }, [token, fetchTodos]);

  // Auto-sync new task due date when user clicks a date filter
  useEffect(() => {
    if (filterDate) {
      setDueDate(filterDate);
    }
  }, [filterDate]);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;
    if (trimmedTitle.length < 3) {
      toast.error('Task title must be at least 3 characters long');
      return;
    }

    if (user?.plan !== 'premium' && todos.length >= 40) {
      toast.error('Free plan limit reached. Please upgrade to Premium.');
      setIsUpgradeModalOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/todos', {
        title: trimmedTitle,
        dueDate: dueDate ? dueDate.toISOString() : null
      });
      setTodos([response.data, ...todos]);
      setNewTitle('');
      setDueDate(filterDate ? filterDate : (() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      })());
      toast.success('Task added successfully!');
      newTodoInputRef.current?.focus();
    } catch (error) {
      toast.error(error.response?.data || 'Failed to add task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTodo = async (id, currentCompleted) => {
    try {
      const response = await api.put(`/todos/${id}`, { completed: !currentCompleted });
      setTodos(todos.map(todo => todo._id === id ? response.data : todo));
      toast.success(response.data.completed ? 'Task completed!' : 'Task active.');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const startEditing = (id, title, due) => {
    setEditingId(id);
    setEditingTitle(title);
    setEditingDueDate(due ? new Date(due) : null);
  };

  // Handle file upload
  const handleFileUpload = async (todoId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('attachment', file);
    try {
      const response = await api.post(`/todos/${todoId}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setTodos(todos.map(todo => todo._id === todoId ? response.data : todo));
      toast.success('File attached successfully!');
    } catch (error) {
      toast.error('Failed to attach file');
    }
  };

  // Handle attachment deletion
  const handleDeleteAttachment = async (todoId, filename) => {
    try {
      const response = await api.delete(`/todos/${todoId}/attachments/${filename}`);
      setTodos(todos.map(todo => todo._id === todoId ? response.data : todo));
      toast.success('Attachment deleted');
    } catch (error) {
      toast.error('Failed to delete attachment');
    }
  };

  const handleUpdateTodo = async (id) => {
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) return;
    if (trimmedTitle.length < 3) {
      toast.error('Task title must be at least 3 characters long');
      return;
    }
    try {
      const response = await api.put(`/todos/${id}`, {
        title: trimmedTitle,
        dueDate: editingDueDate ? editingDueDate.toISOString() : null
      });
      setTodos(todos.map(todo => todo._id === id ? response.data : todo));
      setEditingId(null);
      setEditingTitle('');
      setEditingDueDate(null);
      toast.success('Task updated successfully!');
    } catch (error) {
      toast.error(error.response?.data || 'Failed to update task');
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      await api.delete(`/todos/${id}`);
      setTodos(todos.filter(todo => todo._id !== id));
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  // Analytics
  const totalTasks      = todos.length;
  const completedTasks  = todos.filter(t => t.completed).length;
  const pendingTasks    = totalTasks - completedTasks;
  const completionRate  = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const isFreePlan = !user?.plan || user?.plan === 'free';
  const limitReached = isFreePlan && totalTasks >= 40;

  // Dates that have tasks (for calendar dots)
  const todoDates = todos
    .filter(t => t.dueDate)
    .map(t => new Date(t.dueDate));

  // Filter & Search
  const filteredTodos = todos.filter(todo => {
    const matchesSearch = todo.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === 'all'       ? true :
      filter === 'completed' ? todo.completed :
      !todo.completed;

    let matchesDate = true;
    if (filterDate) {
      if (!todo.dueDate) {
        matchesDate = false;
      } else {
        const d1 = new Date(todo.dueDate);
        const d2 = filterDate;
        matchesDate = d1.getFullYear() === d2.getFullYear() &&
                      d1.getMonth() === d2.getMonth() &&
                      d1.getDate() === d2.getDate();
      }
    }

    return matchesSearch && matchesFilter && matchesDate;
  });

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due   = new Date(d);
    due.setHours(0, 0, 0, 0);
    const diff  = Math.round((due - today) / (1000 * 60 * 60 * 24));
    if (diff < 0)  return { label: 'Overdue', color: 'text-red-500' };
    if (diff === 0) return { label: 'Due Today', color: 'text-amber-500' };
    if (diff === 1) return { label: 'Due Tomorrow', color: 'text-amber-400' };
    return {
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: 'text-gray-400 dark:text-gray-500'
    };
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">

      {/* Unified Analytics Banner */}
      <div className="glass-panel rounded-[2rem] p-6 lg:p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden bg-white dark:bg-slate-900">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl"></div>
        
        {/* Left Side: Completion Rate */}
        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
          <div className="relative w-24 h-24 shrink-0 drop-shadow-sm">
             <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
               <path className="text-slate-100 dark:text-slate-800" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
               <motion.path className="text-brand-500" strokeWidth="3.5" strokeDasharray={`${completionRate}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" initial={{ strokeDasharray: "0, 100" }} animate={{ strokeDasharray: `${completionRate}, 100` }} transition={{ duration: 1.5, ease: "easeOut" }} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
             </svg>
             <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{completionRate}%</span>
             </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">Your Progress</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Keep up the great work today!</p>
          </div>
        </div>

        {/* Right Side: Metrics */}
        <div className="flex items-center justify-between w-full md:w-auto md:gap-12 relative z-10">
          <div className="text-center">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{totalTasks}</p>
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800"></div>
          <div className="text-center">
            <p className="text-[11px] font-bold text-brand-500 dark:text-brand-400 uppercase tracking-widest mb-1">Completed</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{completedTasks}</p>
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800"></div>
          <div className="text-center">
            <p className="text-[11px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest mb-1">Pending</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{pendingTasks}</p>
          </div>
        </div>
      </div>

      {/* Header section as requested */}
      <div className="mb-8 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
          Good Morning, {user?.name ? user.name.split(' ')[0] : 'User'} 👋
        </h1>
        
        {isFreePlan && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                <span>Free Plan Limit</span>
                <span>{totalTasks} / 40 Todos Used</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${limitReached ? 'bg-red-500' : 'bg-brand-500'}`}
                  style={{ width: `${Math.min((totalTasks / 40) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <button 
              onClick={() => setIsUpgradeModalOpen(true)}
              className="whitespace-nowrap bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              Upgrade to Premium ✨
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Create task */}
          <div className="glass-panel rounded-2xl p-6 shadow-sm">
            {limitReached ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiX className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You've reached the Free Plan limit (40 todos).</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Upgrade to Premium for:</p>
                <ul className="text-left max-w-xs mx-auto space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                    <FiCheckCircle className="text-green-500" /> Unlimited Todos
                  </li>
                  <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                    <FiCheckCircle className="text-green-500" /> Priority Support
                  </li>
                  <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                    <FiCheckCircle className="text-green-500" /> Future Premium Features
                  </li>
                </ul>
                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-brand-500 hover:from-blue-700 hover:to-brand-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md"
                >
                  Upgrade Now
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create New Task</h3>
                <form onSubmit={handleAddTodo} className="space-y-4">
                  <input
                    type="text"
                    ref={newTodoInputRef}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-all duration-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowCalendar(v => !v)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] ${
                      dueDate
                        ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/50'
                        : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                    }`}
                  >
                    <FiCalendar className="h-4 w-4 shrink-0" />
                    {dueDate
                      ? dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      : 'Set Due Date'}
                    {dueDate && (
                      <span
                        onClick={(e) => { e.stopPropagation(); setDueDate(null); }}
                        className="ml-auto text-brand-400 hover:text-brand-600 cursor-pointer"
                      >
                        <FiX className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || !newTitle.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <FiPlus className="h-5 w-5" />
                    Add Task
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Calendar */}
          <AnimatePresence>
            {showCalendar && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CalendarPicker
                  selectedDate={dueDate}
                  onSelect={(d) => { setDueDate(d); if (d) setShowCalendar(false); }}
                  todoDates={todoDates}
                  showTwoMonths={true}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter & Search */}
          <div className="glass-panel rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filter &amp; Search</h3>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="block w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-all duration-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]"
              />
            </div>

            <div className="flex flex-col gap-2">
              {[
                { key: 'all',       label: 'All Tasks',  count: totalTasks,     active: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' },
                { key: 'pending',   label: 'Pending',    count: pendingTasks,   active: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
                { key: 'completed', label: 'Completed',  count: completedTasks, active: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' },
              ].map(({ key, label, count, active }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    filter === key ? active : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <span>{label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200/50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    {count}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setShowFilterCalendar(v => !v)}
                className={`flex w-full items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  filterDate
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-200 dark:border-brand-500/30'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiCalendar className="h-4 w-4 shrink-0" />
                  <span>
                    {filterDate
                      ? `Filtering: ${filterDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : '🗓️ Filter by Date'}
                  </span>
                </div>
                {filterDate && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterDate(null);
                    }}
                    className="p-1 hover:bg-brand-100 dark:hover:bg-brand-500/20 rounded-md transition-colors"
                  >
                    <FiX className="h-4 w-4" />
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showFilterCalendar && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <CalendarPicker
                      selectedDate={filterDate}
                      onSelect={(d) => {
                        setFilterDate(d);
                        if (d) setShowFilterCalendar(false); // Auto-collapse on selection
                      }}
                      todoDates={todoDates}
                      showTwoMonths={false}
                      labelPrefix="Filtering:"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right column: Task list */}
        <div className="lg:col-span-3">
          <div className="glass-panel rounded-3xl p-6 lg:p-8 shadow-sm min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Your Tasks</h3>
              <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                {filteredTodos.length} {filteredTodos.length === 1 ? 'Task' : 'Tasks'}
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center h-[300px] gap-4">
                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 dark:text-gray-400">Loading your tasks...</p>
              </div>
            ) : (
              <div className="relative">
                <AnimatePresence initial={false}>
                  {filteredTodos.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="flex flex-col items-center justify-center text-center py-12 px-4"
                    >
                      {searchQuery ? (
                        <>
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 text-gray-400 mb-6 shadow-inner">
                            <FiSearch className="h-8 w-8" />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            No matching tasks
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                            We couldn't find any tasks matching "{searchQuery}".
                          </p>
                        </>
                      ) : (
                        <div className="bg-gradient-to-b from-[#f0f5ff] to-white dark:from-blue-900/20 dark:to-transparent p-8 rounded-[32px] w-full max-w-md border border-[#e5edff] dark:border-blue-800/30 shadow-sm relative overflow-hidden">
                          {/* Sparkle decorative background elements could go here */}
                          <div className="absolute top-4 left-4 w-2 h-2 bg-blue-200 rounded-full blur-[1px]"></div>
                          <div className="absolute top-10 right-10 w-3 h-3 bg-yellow-200 rounded-full blur-[1px]"></div>
                          <div className="absolute bottom-20 left-12 w-2 h-2 bg-brand-200 rounded-full blur-[1px]"></div>
                          
                          <div className="relative mx-auto w-24 h-24 mb-6">
                            <div className="absolute inset-0 bg-blue-200/50 dark:bg-blue-900/40 rounded-full blur-2xl animate-pulse"></div>
                            <motion.div 
                              animate={{ y: [0, -10, 0] }}
                              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                              className="relative flex items-center justify-center w-full h-full text-[72px] drop-shadow-2xl select-none"
                            >
                              🎉
                            </motion.div>
                          </div>
                          <h4 className="text-[26px] font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                            All done for today!
                          </h4>
                          <p className="text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed mb-8 max-w-[280px] mx-auto">
                            Take a moment to relax —<br/>or plan ahead if you're in the flow.
                          </p>
                          <button 
                            onClick={() => {
                               const tmrw = new Date();
                               tmrw.setDate(tmrw.getDate() + 1);
                               setDueDate(tmrw);
                               window.scrollTo({ top: 0, behavior: 'smooth' });
                               setTimeout(() => newTodoInputRef.current?.focus(), 300);
                            }}
                            className="w-full bg-[#0066FF] hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(0,102,255,0.4)] hover:shadow-[0_12px_25px_-6px_rgba(0,102,255,0.5)] hover:-translate-y-1 active:translate-y-0 active:shadow-md"
                          >
                            Plan tomorrow
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.ul layout className="space-y-3">
                      {filteredTodos.map((todo) => {
                        const due = formatDueDate(todo.dueDate);
                        return (
                          <motion.li
                            key={todo._id}
                            layout
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className={`flex items-start justify-between gap-4 p-5 rounded-2xl transition-all duration-200 ${
                              todo.completed 
                                ? 'bg-slate-50/50 opacity-75 dark:bg-slate-800/30' 
                                : 'bg-white shadow-sm border border-slate-200 hover:shadow-md dark:bg-slate-900 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              {/* Checkbox */}
                              <button
                                onClick={() => handleToggleTodo(todo._id, todo.completed)}
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 mt-0.5 ${
                                  todo.completed
                                    ? 'bg-brand-500 border-brand-500 text-white'
                                    : 'border-slate-300 dark:border-slate-600 hover:border-brand-500 dark:hover:border-brand-400'
                                }`}
                              >
                                {todo.completed && <FiCheck className="h-4 w-4 stroke-[3]" />}
                              </button>

                              {/* Title + Due date */}
                              <div className="flex-1 min-w-0">
                                {editingId === todo._id ? (
                                  <input
                                    type="text"
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateTodo(todo._id)}
                                    autoFocus
                                    className="block w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-1.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all duration-200"
                                  />
                                ) : (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate block ${
                                      todo.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                                    }`}>
                                      {todo.title}
                                    </span>
                                    {todo.completed && (
                                      <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 text-[10px] font-bold uppercase tracking-widest">
                                        Completed
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Due date badge */}
                                {due && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      due.label.includes('Overdue') ? 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400' :
                                      due.label.includes('Today') ? 'bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400' :
                                      'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                      {due.label}
                                    </span>
                                  </div>
                                )}

                                {/* Attachments List */}
                                {todo.attachments && todo.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {todo.attachments.map(att => (
                                      <div key={att.filename} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-md px-2.5 py-1 transition-colors border border-slate-200 dark:border-slate-700">
                                        <a 
                                          href={att.path.startsWith('http') ? att.path : `http://localhost:3001${att.path}`} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="text-xs text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 truncate max-w-[150px] font-medium"
                                        >
                                          {att.originalName}
                                        </a>
                                        <button 
                                          onClick={() => handleDeleteAttachment(todo._id, att.filename)} 
                                          className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 p-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                          title="Delete attachment"
                                        >
                                          <FiX className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {editingId === todo._id ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateTodo(todo._id)}
                                    className="h-8 w-8 rounded-lg flex items-center justify-center bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-500 dark:hover:text-white transition-all duration-200"
                                    title="Save"
                                  >
                                    <FiCheck className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="h-8 w-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                                    title="Cancel"
                                  >
                                    <FiX className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <label 
                                    className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-brand-500 dark:hover:text-brand-400 cursor-pointer transition-all duration-200"
                                    title="Attach File"
                                  >
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleFileUpload(todo._id, e.target.files[0]);
                                        }
                                        e.target.value = ''; // Reset input so same file can be selected again
                                      }}
                                    />
                                    <FiPaperclip className="h-4 w-4" />
                                  </label>
                                  <button
                                    onClick={() => startEditing(todo._id, todo.title, todo.dueDate)}
                                    className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200"
                                    title="Edit"
                                  >
                                    <FiEdit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTodo(todo._id)}
                                    className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200"
                                    title="Delete"
                                  >
                                    <FiTrash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </motion.li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

      </div>

      <MobileBottomNav 
        onAddTaskClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => newTodoInputRef.current?.focus(), 300);
        }} 
      />

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
      />
    </div>
  );
};

export default Dashboard;
