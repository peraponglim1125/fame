import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------- Types ---------- */
type Member = { ID: number; username?: string; UserName?: string };
type DMThread = {
  ID: number;
  user1Id: number;
  user2Id: number;
  user1: Member;
  user2: Member;
  lastMessageAt: string;
  CreatedAt?: string;
  UpdatedAt?: string;
};
type DMFile = {
  ID: number;
  postId: number;
  fileUrl: string;
  fileType: "image" | "video" | "file" | string;
};
type DMPost = {
  ID: number;
  threadId: number;
  senderId: number;
  sender: Member;
  content: string;
  isRead: boolean;
  editedAt?: string | null;
  CreatedAt: string;
  Files?: DMFile[];
};

/* ---------- Config ---------- */
const API = "http://localhost:8080/api";
const API_HOST = API.replace(/\/api\/?$/, "");

const makeUrl = (u?: string) => {
  let s = (u || "").trim().replace(/\\/g, "/");
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) {
    if (!s.startsWith("/")) s = "/" + s;
    s = `${API_HOST}${s}`;
  }
  return s;
};

// รองรับทั้ง username และ UserName จาก backend
const nameOf = (m?: Member | null) => (m?.username ?? m?.UserName ?? "").toString();

/* ---------- Theme ---------- */
const ORANGE = {
  50: "#FFF7ED",
  100: "#FFEDD5",
  200: "#FED7AA",
  300: "#FDBA74",
  400: "#FB923C",
  500: "#F97316",
  600: "#EA580C",
  700: "#C2410C",
  800: "#9A3412",
  900: "#7C2D12",
};
const bubbleStyle = {
  mine: { background: ORANGE[500], color: "white" as const },
  other: { background: "#fff", color: "#111" as const, border: `1px solid ${ORANGE[100]}` },
};

/* ---------- Auth helpers ---------- */
const readStoredUser = (): Member | null => {
  try {
    const raw =
      localStorage.getItem("auth:user") ||
      localStorage.getItem("currentUser") ||
      localStorage.getItem("user");
    if (raw) {
      const o = JSON.parse(raw);
      const u = (o?.data ?? o) as any;
      if (u && typeof u === "object") {
        const ID = Number(u.ID ?? u.id);
        const username = u.username ?? u.UserName ?? u.userName;
        if (!Number.isNaN(ID)) return { ID, username, UserName: username };
      }
    }
  } catch {}
  const uid = localStorage.getItem("uid") || sessionStorage.getItem("uid");
  if (uid && !Number.isNaN(Number(uid))) return { ID: Number(uid), username: "Me" };
  return null;
};
const readToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("auth:token") ||
  sessionStorage.getItem("token") ||
  "";

// token ใช้ได้เมื่อเป็น JWT (มี 2 จุด) หรือเริ่มด้วย uid:
const usableToken = (t?: string | null) =>
  !!t && (t.startsWith("uid:") || (t.includes(".") && t.split(".").length === 3));

/* ---------- Component ---------- */
const Messenger: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Member | null>(readStoredUser());
  const [token, setToken] = useState<string>(readToken());

  // ฟังการเปลี่ยนผู้ใช้จาก storage / custom event
  useEffect(() => {
    const onAuthChanged = () => {
      setCurrentUser(readStoredUser());
      setToken(readToken());
    };
    window.addEventListener("storage", onAuthChanged);
    window.addEventListener("auth-changed", onAuthChanged as any);
    return () => {
      window.removeEventListener("storage", onAuthChanged);
      window.removeEventListener("auth-changed", onAuthChanged as any);
    };
  }, []);

  // ===== Header auth: บังคับใช้ uid เสมอ + แนบ X-User-Id =====
  const authHeaderValue = useMemo(() => {
    // ให้ uid นำเสมอ (ฝั่ง Go รองรับ Bearer uid:<id>)
    if (currentUser?.ID) return `Bearer uid:${currentUser.ID}`;
    if (usableToken(token)) return `Bearer ${token!}`;
    return "";
  }, [token, currentUser?.ID]);

  // ===== apiFetch: ใส่ Authorization + X-User-Id ทุกครั้ง (รวม PATCH/DELETE) =====
  async function apiFetch<T = any>(
    url: string,
    init: RequestInit = {},
    jsonBody?: any
  ): Promise<{ ok: boolean; status: number; data?: T; error?: any; raw: Response }> {
    const headers = new Headers(init.headers || {});
    if (authHeaderValue) headers.set("Authorization", authHeaderValue);
    if (currentUser?.ID) headers.set("X-User-Id", String(currentUser.ID));

    if (jsonBody !== undefined) {
      headers.set("Content-Type", "application/json");
      init.body = JSON.stringify(jsonBody);
    }

    const res = await fetch(url, {
      mode: "cors",
      cache: "no-store",
      ...init,
      headers,
    });

    let payload: any = undefined;
    try {
      payload = await res.json();
    } catch {
      // บาง response ไม่มี body
    }

    if (!res.ok) {
      return { ok: false, status: res.status, error: payload, raw: res };
    }
    return { ok: true, status: res.status, data: payload as T, raw: res };
  }

  /* ---------- State ---------- */
  const [threads, setThreads] = useState<DMThread[]>([]);
  const [selected, setSelected] = useState<DMThread | null>(null);

  const [posts, setPosts] = useState<DMPost[]>([]);
  const [msg, setMsg] = useState("");
  const [fileList, setFileList] = useState<File[]>([]);
  const [friendUsername, setFriendUsername] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const partner = useMemo(() => {
    if (!selected || !currentUser?.ID) return null;
    return selected.user1Id === currentUser.ID ? selected.user2 : selected.user1;
  }, [selected, currentUser?.ID]);

  /* ---------- Normalizers ---------- */
  const normalizeFile = (f: any): DMFile => ({
    ID: f.ID ?? f.id,
    postId: f.postId ?? f.post_id ?? f.messageId ?? f.message_id,
    fileUrl: makeUrl(f.fileUrl ?? f.file_url ?? f.url),
    fileType: (f.fileType ?? f.file_type ?? f.type ?? "file").toLowerCase(),
  });

  const normalizePost = (p: any): DMPost => ({
    ...p,
    Files: (p.Files ?? p.files ?? p.Attachments ?? p.attachments ?? []).map(normalizeFile),
  });

  /* ---------- Fetch Threads / Posts ---------- */
  const loadThreads = async () => {
    if (!currentUser?.ID) return;
    const r = await apiFetch<{ data: DMThread[] }>(
      `${API}/dm/threads?memberId=${currentUser.ID}`,
      { method: "GET" }
    );
    if (!r.ok) {
      console.error("loadThreads error", r.status, r.error);
      alert(`โหลดห้องไม่สำเร็จ: ${r.status}`);
      return;
    }
    const list: DMThread[] = (r.data as any)?.data || [];
    setThreads(list);

    if (selected && !(selected.user1Id === currentUser.ID || selected.user2Id === currentUser.ID)) {
      setSelected(null);
      setPosts([]);
    }
  };

  const loadPosts = async (threadId: number) => {
    const r = await apiFetch<{ data: DMPost[] }>(
      `${API}/dm/threads/${threadId}/posts?offset=0&limit=100`,
      { method: "GET" }
    );
    if (!r.ok) {
      console.error("loadPosts error", r.status, r.error);
      alert(`โหลดข้อความไม่สำเร็จ: ${r.status}`);
      return;
    }
    const list: DMPost[] = (((r.data as any)?.data) || []).map(normalizePost);
    setPosts(list);

    if (currentUser?.ID) {
      await apiFetch(`${API}/dm/threads/${threadId}/read`, { method: "PATCH" }, { memberId: currentUser.ID });
    }
  };

  useEffect(() => { if (currentUser?.ID) loadThreads(); }, [currentUser?.ID]);
  useEffect(() => { if (selected?.ID) loadPosts(selected.ID); }, [selected?.ID, currentUser?.ID]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [posts.length]);
  useEffect(() => {
    setSelected(null);
    setPosts([]);
    setMsg("");
    setFileList([]);
    setFriendUsername("");
    setEditingId(null);
    setEditText("");
  }, [currentUser?.ID]);

  /* ---------- Open/Create Thread ---------- */
  const openThreadByUsername = async () => {
    if (!friendUsername.trim() || !currentUser?.ID) return;
    const friend = friendUsername.trim().replace(/^["']|["']$/g, "");
    const r = await apiFetch(`${API}/dm/threads/open`, { method: "POST" }, {
      currentUserId: currentUser.ID,
      friendUsername: friend,
    });
    if (!r.ok) {
      alert((r.error && r.error.error) || "เปิดห้องไม่สำเร็จ");
      return;
    }
    const th = (r.data as any)?.data;
    await loadThreads();
    setFriendUsername("");
    setSelected(th);
  };

  /* ---------- Upload ---------- */
  const uploadOne = async (file: File): Promise<{ url: string; type: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await apiFetch<{ url: string }>(`${API}/dm/upload`, { method: "POST", body: fd });
    if (!r.ok) throw new Error("upload failed");
    const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";
    return { url: makeUrl((r.data as any)?.url), type };
  };

  /* ---------- Send Message ---------- */
  const sendMessage = async () => {
    if (!selected || !currentUser?.ID) return;
    if (!msg.trim() && fileList.length === 0) return;

    const uploaded: { fileUrl: string; fileType: string }[] = [];
    for (const f of fileList) {
      const r = await uploadOne(f);
      uploaded.push({ fileUrl: r.url, fileType: r.type });
    }

    const r = await apiFetch(`${API}/dm/threads/${selected.ID}/posts`, { method: "POST" }, {
      senderId: currentUser.ID,
      content: msg,
      attachments: uploaded,
    });
    if (!r.ok) {
      alert((r.error && r.error.error) || "ส่งไม่สำเร็จ");
      return;
    }
    const js = (r.data as any)?.data;
    setPosts((p) => [...p, normalizePost(js)]);
    setMsg("");
    setFileList([]);
    await loadThreads();
  };

  /* ---------- Edit/Delete Message ---------- */
  const startEdit = (p: DMPost) => {
    setEditingId(p.ID);
    setEditText(p.content);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const r = await apiFetch(`${API}/dm/posts/${editingId}`, { method: "PATCH" }, { content: editText });
    if (!r.ok) {
      alert((r.error && r.error.error) || "แก้ไขไม่สำเร็จ");
      return;
    }
    const upd = normalizePost((r.data as any)?.data);
    setPosts((arr) => arr.map((x) => (x.ID === editingId ? upd : x)));
    setEditingId(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const removePost = async (id: number) => {
    if (!confirm("ลบข้อความนี้?")) return;
    const r = await apiFetch(`${API}/dm/posts/${id}`, { method: "DELETE" });
    if (!r.ok) {
      alert((r.error && r.error.error) || "ลบไม่สำเร็จ");
      return;
    }
    setPosts((arr) => arr.filter((x) => x.ID !== id));
    await loadThreads();
  };

  const removeThread = async (id: number) => {
    if (!confirm("ลบห้องแชทนี้ทั้งหมด?")) return;
    const r = await apiFetch(`${API}/dm/threads/${id}`, { method: "DELETE" });
    if (!r.ok) {
      alert((r.error && r.error.error) || "ลบห้องไม่สำเร็จ");
      return;
    }
    await loadThreads();
    if (selected?.ID === id) setSelected(null);
  };

  /* ---------- UI ---------- */
  if (!currentUser?.ID) {
    return (
      <div style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
        <h2 style={{ color: ORANGE[700], marginBottom: 8 }}>ยังไม่ได้ล็อกอิน</h2>
        <div style={{ color: "#666" }}>
          กรุณาเข้าสู่ระบบก่อน แล้วกลับเข้าหน้านี้อีกครั้ง
        </div>
      </div>
    );
  }

  return (
    <div
      key={currentUser.ID}
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        background: `radial-gradient(1200px 600px at -10% -20%, ${ORANGE[50]} 0, white 60%)`,
        color: "#111",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Left - Thread List */}
      <div style={{ borderRight: `1px solid ${ORANGE[100]}`, padding: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: ORANGE[700] }}>
          SUT Messenger
        </div>

        <div
          style={{
            background: "white",
            border: `1px solid ${ORANGE[100]}`,
            borderRadius: 12,
            padding: 10,
            marginBottom: 12,
            boxShadow: "0 8px 24px rgba(249,115,22,0.08)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, color: ORANGE[600] }}>
            เพิ่มเพื่อนด้วยชื่อผู้ใช้
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              placeholder="พิมพ์ username หรือ id เช่น 5"
              style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${ORANGE[200]}` }}
              onKeyDown={(e) => {
                if (e.key === "Enter") openThreadByUsername();
              }}
            />
            <button
              onClick={openThreadByUsername}
              style={{
                background: ORANGE[500],
                color: "white",
                border: "none",
                borderRadius: 10,
                padding: "10px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              สร้าง/เปิด
            </button>
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: ORANGE[700] }}>
          ห้องของฉัน
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            overflowY: "auto",
            height: "calc(100% - 180px)",
          }}
        >
          {threads.map((t) => {
            const p = t.user1Id === currentUser.ID ? t.user2 : t.user1;
            const isSel = selected?.ID === t.ID;
            return (
              <div
                key={t.ID}
                onClick={() => setSelected(t)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: isSel ? ORANGE[100] : "white",
                  border: `1px solid ${isSel ? ORANGE[300] : ORANGE[100]}`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: ORANGE[700] }}>{nameOf(p) || "Unknown"}</div>
                  <div style={{ fontSize: 12, color: "#777" }}>
                    ล่าสุด: {new Date(t.lastMessageAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    removeThread(t.ID);
                  }}
                  style={{
                    background: "white",
                    border: `1px solid ${ORANGE[200]}`,
                    color: ORANGE[700],
                    borderRadius: 10,
                    padding: "6px 10px",
                    cursor: "pointer",
                  }}
                  title="ลบห้อง"
                >
                  ลบ
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right - Chat */}
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100vh" }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${ORANGE[100]}`, background: "white" }}>
          {partner ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: ORANGE[200],
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  color: ORANGE[800],
                }}
              >
                {(nameOf(partner) || "?").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: ORANGE[700] }}>
                  {nameOf(partner) || "Unknown"}
                </div>
                <div style={{ fontSize: 12, color: "#888" }}>ห้อง #{selected?.ID}</div>
              </div>
            </div>
          ) : (
            <div style={{ color: "#888" }}>เลือกห้องทางซ้าย หรือสร้างห้องใหม่</div>
          )}
        </div>

        {/* Timeline */}
        <div style={{ padding: 16, overflowY: "auto", background: ORANGE[50] }}>
          {posts.map((p) => {
            const mine = p.senderId === currentUser.ID;
            return (
              <div
                key={p.ID}
                style={{
                  marginBottom: 12,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: mine ? "flex-end" : "flex-start",
                }}
              >
                <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                  {nameOf(p.sender) || "Unknown"} · {new Date(p.CreatedAt).toLocaleString()}{" "}
                  {p.editedAt ? " · แก้ไขแล้ว" : ""}
                </div>

                <div
                  style={{
                    maxWidth: 640,
                    padding: "10px 12px",
                    borderRadius: 14,
                    ...(mine ? bubbleStyle.mine : bubbleStyle.other),
                    boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
                  }}
                >
                  {editingId === p.ID ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        style={{
                          flex: 1,
                          border: "none",
                          outline: "none",
                          background: "white",
                          padding: 8,
                          borderRadius: 8,
                        }}
                      />
                      <button
                        onClick={saveEdit}
                        style={{
                          background: ORANGE[600],
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          padding: "6px 10px",
                        }}
                      >
                        บันทึก
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{
                          background: "white",
                          color: ORANGE[700],
                          border: `1px solid ${ORANGE[300]}`,
                          borderRadius: 8,
                          padding: "6px 10px",
                        }}
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <div style={{ whiteSpace: "pre-wrap" }}>{p.content}</div>
                  )}

                  {/* Files */}
                  {p.Files && p.Files.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {p.Files.map((f) => (
                        <div
                          key={f.ID}
                          style={{
                            borderRadius: 10,
                            overflow: "hidden",
                            border: `1px solid ${ORANGE[100]}`,
                            background: "white",
                          }}
                        >
                          {f.fileType === "image" ? (
                            <img
                              src={f.fileUrl}
                              alt="attachment"
                              loading="lazy"
                              style={{ width: "100%", display: "block" }}
                            />
                          ) : (
                            <a
                              href={f.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "block",
                                padding: 10,
                                textDecoration: "none",
                                color: ORANGE[700],
                              }}
                            >
                              เปิดไฟล์: {decodeURIComponent(f.fileUrl.split("/").pop() || "")}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {mine && editingId !== p.ID && (
                  <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                    <button
                      onClick={() => startEdit(p)}
                      style={{
                        background: "white",
                        border: `1px solid ${ORANGE[300]}`,
                        color: ORANGE[700],
                        borderRadius: 8,
                        padding: "4px 8px",
                      }}
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => removePost(p.ID)}
                      style={{
                        background: "white",
                        border: `1px solid ${ORANGE[300]}`,
                        color: ORANGE[700],
                        borderRadius: 8,
                        padding: "4px 8px",
                      }}
                    >
                      ลบ
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: 12, borderTop: `1px solid ${ORANGE[100]}`, background: "white" }}>
          {selected ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="พิมพ์ข้อความ..."
                  style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${ORANGE[200]}` }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) sendMessage();
                  }}
                />
                <label
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${ORANGE[200]}`,
                    cursor: "pointer",
                    background: ORANGE[50],
                    color: ORANGE[700],
                    fontWeight: 700,
                  }}
                >
                  แนบไฟล์
                  <input
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => setFileList(Array.from(e.target.files || []))}
                  />
                </label>
                {fileList.length > 0 && (
                  <div style={{ alignSelf: "center", fontSize: 12, color: ORANGE[700] }}>
                    เลือก {fileList.length} ไฟล์
                  </div>
                )}
              </div>
              <button
                onClick={sendMessage}
                style={{
                  background: ORANGE[600],
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  padding: "0 20px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ส่ง
              </button>
            </div>
          ) : (
            <div style={{ color: "#888" }}>ยังไม่ได้เลือกห้อง</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messenger;
