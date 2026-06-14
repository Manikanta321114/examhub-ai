const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("examhub_token");
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };


  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      // ignore
    }
    throw new Error(errorMessage);
  }

  // Handle delete or no content response
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return null;
  }

  return response.json();
}

export const api = {
  auth: {
    signup: (data) => request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
    login: async (credentials) => {
      const tokenData = await request("/auth/login", { 
        method: "POST", 
        body: JSON.stringify(credentials) 
      });
      localStorage.setItem("examhub_token", tokenData.access_token);
      return tokenData;
    },
    logout: () => {
      localStorage.removeItem("examhub_token");
    },
    me: () => request("/auth/me"),
  },
  exams: {
    getAll: (params = {}) => {
      const query = new URLSearchParams();
      if (params.search) query.append("search", params.search);
      if (params.category) query.append("category", params.category);
      if (params.level) query.append("level", params.level);
      if (params.status) query.append("status", params.status);
      if (params.state) query.append("state", params.state);
      if (params.difficulty) query.append("difficulty", params.difficulty);
      if (params.source_verified !== undefined && params.source_verified !== "") {
        query.append("source_verified", params.source_verified);
      }
      const queryString = query.toString() ? `?${query.toString()}` : "";
      return request(`/exams/${queryString}`);
    },
    getById: (id) => request(`/exams/${id}`),
    create: (data) => request("/exams/", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/exams/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id) => request(`/exams/${id}`, { method: "DELETE" }),
    toggleBookmark: (id) => request(`/exams/${id}/bookmark`, { method: "POST" }),
    importPreview: (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return request("/exams/import/preview", {
        method: "POST",
        body: formData,
      });
    },
    importConfirm: (payload) => {
      return request("/exams/import/confirm", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
  dashboard: {
    get: () => request("/dashboard/"),
  },
  ai: {
    chat: (message, history = [], language = "en") => request("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, history, language })
    }),
    dailySummary: () => request("/ai/daily-summary"),
  },
  aiAutomation: {
    scan: (mode = "quick") => request(`/admin/ai-automation/scan?mode=${mode}`, { method: "POST" }),
    getSuggestions: (status = "pending") => request(`/admin/ai-automation/suggestions?status=${status}`),
    approve: (id, data) => request(`/admin/ai-automation/suggestions/${id}/approve`, { method: "POST", ...(data && { body: JSON.stringify(data) }) }),
    reject: (id) => request(`/admin/ai-automation/suggestions/${id}/reject`, { method: "POST" }),
    rollback: (id) => request(`/admin/ai-automation/suggestions/${id}/rollback`, { method: "POST" }),
    getLogs: () => request("/admin/ai-automation/logs"),
    getSettings: () => request("/admin/ai-automation/settings"),
    updateSettings: (data) => request("/admin/ai-automation/settings", { method: "POST", body: JSON.stringify(data) }),
    getAnalytics: () => request("/admin/ai-automation/analytics"),
  },
  analytics: {
    recordView: (id) => request(`/admin/analytics/exams/${id}/view`, { method: "POST" }),
    recordClick: (id) => request(`/admin/analytics/exams/${id}/click`, { method: "POST" }),
    getOverview: () => request("/admin/analytics/overview"),
    getUsers: () => request("/admin/analytics/users"),
    getExams: () => request("/admin/analytics/exams"),
  },
  suggestions: {
    submit: (data) => request("/suggestions/", { method: "POST", body: JSON.stringify(data) }),
    getMy: () => request("/suggestions/my"),
    getAdmin: (sortBy = "newest") => request(`/suggestions/admin?sort_by=${sortBy}`),
    approve: (id) => request(`/suggestions/admin/${id}/approve`, { method: "POST" }),
    reject: (id, reason) => request(`/suggestions/admin/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  },
  settings: {
    updateEmail: (email, currentPassword) => request("/auth/settings/email", {
      method: "PUT",
      body: JSON.stringify({ email, current_password: currentPassword })
    }),
    updatePassword: (newPassword, currentPassword) => request("/auth/settings/password", {
      method: "PUT",
      body: JSON.stringify({ new_password: newPassword, current_password: currentPassword })
    }),
    getActivityLogs: () => request("/auth/activity-logs"),
  },
  feedback: {
    submit: (data) => request("/feedback/", { method: "POST", body: JSON.stringify(data) }),
    getAdmin: () => request("/feedback/admin"),
  }
};
