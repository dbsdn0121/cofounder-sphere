"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useConversations, useConversationMessages } from "../../../../hooks/useConversations";
import {
  MessageCircle,
  CheckCircle,
  X,
  Send,
  Search,
  Star,
  Users,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// -------------------- Types --------------------

type MessageType = "direct_message" | "system";
type MessageStatus = "read" | "unread";

type MessageListItem = {
  id: string;
  type: MessageType;
  status: MessageStatus;
  from: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  to: {
    id: string;
    name: string;
  };
  subject: string;
  content: string;
  timestamp: string;
  isStarred?: boolean;
};

type FilterTab = "all" | "messages" | "starred";

// 연락처 정보
type ContactInfo = {
  email?: string;
  discord?: string;
  reddit?: string;
  github?: string;
  website?: string;
  timezone?: string;
  availability?: string;
  note?: string;
};

type ContactShareMetadata =
  | {
      kind: "contact_share_request";
      status: "pending";
      requester: ContactInfo & { name?: string; avatar?: string };
      requested_at: string;
      client_key?: string;
    }
  | {
      kind: "contact_share_accepted";
      accepted_at: string;
      requester: ContactInfo & { name?: string; avatar?: string };
      responder: ContactInfo & { name?: string; avatar?: string };
      client_key?: string;
    }
  | {
      kind: "contact_share_declined";
      declined_at: string;
      reason?: string;
      requester: { name?: string; avatar?: string };
      client_key?: string;
    };

// -------------------- IME-safe inputs --------------------

type ImeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & { value: string; onChange: (v: string) => void };

function ImeSafeInput({ value, onChange, ...rest }: ImeInputProps) {
  const [inner, setInner] = useState(value ?? "");
  const composing = useRef(false);

  useEffect(() => {
    if (!composing.current) setInner(value ?? "");
  }, [value]);

  return (
    <input
      {...rest}
      value={inner}
      onChange={(e) => {
        const v = e.target.value;
        setInner(v);
        if (!composing.current) onChange(v);
      }}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={(e) => {
        composing.current = false;
        const v = (e.target as HTMLInputElement).value;
        setInner(v);
        onChange(v);
      }}
    />
  );
}

type ImeTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange"
> & { value: string; onChange: (v: string) => void };

function ImeSafeTextarea({ value, onChange, ...rest }: ImeTextareaProps) {
  const [inner, setInner] = useState(value ?? "");
  const composing = useRef(false);

  useEffect(() => {
    if (!composing.current) setInner(value ?? "");
  }, [value]);

  return (
    <textarea
      {...rest}
      value={inner}
      onChange={(e) => {
        const v = e.target.value;
        setInner(v);
        if (!composing.current) onChange(v);
      }}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={(e) => {
        composing.current = false;
        const v = (e.target as HTMLTextAreaElement).value;
        setInner(v);
        onChange(v);
      }}
    />
  );
}

// -------------------- Component --------------------

export default function MessagesPage() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatId = searchParams.get("chat");

  const { conversations, loading: conversationsLoading, error: conversationsError } = useConversations();
  const {
    messages: apiMessages,
    conversation: selectedConversation,
    loading: messagesLoading,
    sendMessage,
    error: messagesError,
    refetch,
  } = useConversationMessages(chatId);

  const [messages, setMessages] = useState<MessageListItem[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<MessageListItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState("");

  // 공유 모달
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareForm, setShareForm] = useState<ContactInfo>({
    email:
      (user as any)?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      "",
    discord: "",
    reddit: "",
    github: "",
    website: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    availability: "",
    note: "",
  });

  // None 체크 상태
  const [shareNone, setShareNone] = useState<{ discord: boolean; reddit: boolean; github: boolean; website: boolean }>({
    discord: false,
    reddit: false,
    github: false,
    website: false,
  });

  // 수락 모달
  const [showAcceptModal, setShowAcceptModal] = useState<{ open: boolean; originalMessageId?: string }>({ open: false });
  const [acceptForm, setAcceptForm] = useState<ContactInfo>({
    email:
      (user as any)?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      "",
    discord: "",
    reddit: "",
    github: "",
    website: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    availability: "",
    note: "",
  });
  const [acceptNone, setAcceptNone] = useState<{ discord: boolean; reddit: boolean; github: boolean; website: boolean }>({
    discord: false,
    reddit: false,
    github: false,
    website: false,
  });

  const [optimisticMessages, setOptimisticMessages] = useState<any[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ---- 이메일 자동 채우기 (user 로드 이후, 비어 있을 때만 주입) ----
  const myAutofillEmail = useMemo(
    () =>
      ((user as any)?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress ||
        "") ?? "",
    [user]
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (myAutofillEmail) {
      setShareForm((prev) => (prev.email ? prev : { ...prev, email: myAutofillEmail }));
      setAcceptForm((prev) => (prev.email ? prev : { ...prev, email: myAutofillEmail }));
    }
  }, [isLoaded, myAutofillEmail]);

  useEffect(() => {
    if (!chatId && showChatModal) {
      setShowChatModal(false);
      setSelectedChat(null);
      setOptimisticMessages([]);
    }
  }, [chatId, showChatModal]);

  useEffect(() => {
    if (chatId && selectedConversation && !showChatModal) {
      setSelectedChat(selectedConversation);
      setShowChatModal(true);
    }
  }, [chatId, selectedConversation, showChatModal]);

  useEffect(() => {
    const directMessages: MessageListItem[] = conversations.map((conv) => ({
      id: conv.id,
      type: "direct_message" as MessageType,
      status: conv.unread_count && conv.unread_count > 0 ? ("unread" as MessageStatus) : ("read" as MessageStatus),
      from: {
        id: conv.other_user?.id || "",
        name: conv.other_user?.display_name || "Unknown",
        avatar: conv.other_user?.avatar_url,
        role: conv.other_user?.role,
      },
      to: { id: "current_user", name: "You" },
      subject: "Direct Message",
      content: conv.last_message_content || "No messages yet",
      timestamp: conv.last_message_at || conv.created_at,
    }));
    setMessages(directMessages);
  }, [conversations]);

  useEffect(() => {
    let filtered = [...messages];

    switch (activeFilter) {
      case "messages":
        filtered = filtered.filter((msg) => msg.type === "direct_message" || msg.type === "system");
        break;
      case "starred":
        filtered = filtered.filter((msg) => msg.isStarred);
        break;
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (msg) =>
          (msg.subject ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (msg.content ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (msg.from.name ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setFilteredMessages(filtered);
  }, [messages, activeFilter, searchTerm]);

  const handleStarMessage = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, isStarred: !msg.isStarred } : msg))
    );
  };

  const handleMarkAsRead = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, status: msg.status === "unread" ? "read" : msg.status } : msg))
    );
  };

  const closeChatModal = useCallback(() => {
    setShowChatModal(false);
    setSelectedChat(null);
    setNewMessage("");
    setOptimisticMessages([]);
    if (chatId) router.push("/messages");
  }, [router, chatId]);

  const openMessage = useCallback(
    (message: MessageListItem) => {
      if (message.type === "direct_message") {
        router.push(`/messages?chat=${message.id}`);
        const conversation = conversations.find((conv) => conv.id === message.id);
        if (conversation) {
          setSelectedChat(conversation);
          setShowChatModal(true);
        }
        if (message.status === "unread") handleMarkAsRead(message.id);
      }
    },
    [conversations, router]
  );

  const myDisplayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Me";
  const myAvatar = user?.imageUrl;

  const sendChatMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedChat || sendingMessage || !sendMessage) return;

    const messageToSend = newMessage.trim();
    const tempMessageId = `temp-${Date.now()}`;

    try {
      setSendingMessage(true);
      setNewMessage("");

      const sentMessage = await sendMessage(messageToSend);

      if (sentMessage) {
        const optimisticMessage = {
          id: sentMessage.id || tempMessageId,
          conversation_id: selectedChat.id,
          content: messageToSend,
          created_at: new Date().toISOString(),
          sender_id: "current-user",
          message_type: "text",
          metadata: undefined,
          sender: {
            id: "current-user",
            display_name: myDisplayName,
            avatar_url: myAvatar,
            role: undefined,
          },
        };
        setOptimisticMessages((prev) => [...prev, optimisticMessage]);
        refetch?.();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
      setNewMessage(messageToSend);
    } finally {
      setSendingMessage(false);
    }
  }, [newMessage, selectedChat, sendingMessage, sendMessage, myDisplayName, myAvatar, refetch]);

  // --- normalize & validation ---
  type NoneState = { discord: boolean; reddit: boolean; github: boolean; website: boolean };

  const normalizeWithNone = (form: ContactInfo, none: NoneState): ContactInfo => ({
    ...form,
    discord: none.discord ? "" : (form.discord || ""),
    reddit: none.reddit ? "" : (form.reddit || ""),
    github: none.github ? "" : (form.github || ""),
    website: none.website ? "" : (form.website || ""),
  });

  const hasAnyContactFilled = (c: ContactInfo) => {
    const pick = [c.discord, c.reddit, c.github, c.website, c.availability, c.note];
    return pick.some((v) => (v ?? "").toString().trim() !== "");
  };

  const normalizedSharePreview = useMemo(
    () => normalizeWithNone(shareForm, shareNone),
    [shareForm, shareNone]
  );
  const canSubmitShare = useMemo(
    () => hasAnyContactFilled(normalizedSharePreview),
    [normalizedSharePreview]
  );

  const normalizedAcceptPreview = useMemo(
    () => normalizeWithNone(acceptForm, acceptNone),
    [acceptForm, acceptNone]
  );
  const canSubmitAccept = useMemo(
    () => hasAnyContactFilled(normalizedAcceptPreview),
    [normalizedAcceptPreview]
  );

  const makeClientKey = () => `ck-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const submitContactShareRequest = useCallback(async () => {
    if (!selectedChat || !sendMessage || !canSubmitShare) return;

    const clientKey = makeClientKey();
    const normalizedShare = normalizedSharePreview;

    const metadata: ContactShareMetadata = {
      kind: "contact_share_request",
      status: "pending",
      requested_at: new Date().toISOString(),
      requester: {
        name: myDisplayName,
        avatar: myAvatar,
        ...normalizedShare,
      },
      client_key: clientKey,
    };

    try {
      const tempId = `temp-req-${clientKey}`;
      setOptimisticMessages((prev) => [
        ...prev,
        {
          id: tempId,
          conversation_id: selectedChat.id,
          content: `${myDisplayName} wants to share contact info.`,
          created_at: new Date().toISOString(),
          sender_id: "current-user",
          message_type: "contact_share_request",
          metadata,
          sender: { id: "current-user", display_name: myDisplayName, avatar_url: myAvatar },
        },
      ]);

      await sendMessage(
        `${myDisplayName} wants to share contact info.`,
        "contact_share_request" as any,
        metadata as any
      );
      setShowShareModal(false);
      refetch?.();
    } catch (e) {
      console.error(e);
      alert("Failed to send contact share request.");
    }
  }, [selectedChat, sendMessage, myDisplayName, myAvatar, refetch, canSubmitShare, normalizedSharePreview]);

  const submitAcceptContactShare = useCallback(async () => {
    if (!selectedChat || !sendMessage || !showAcceptModal.originalMessageId || !canSubmitAccept) return;

    const original = (apiMessages || []).find((m) => m.id === showAcceptModal.originalMessageId);
    const originalMeta = original?.metadata as ContactShareMetadata | undefined;
    if (!original || !originalMeta || originalMeta.kind !== "contact_share_request") {
      setShowAcceptModal({ open: false });
      return;
    }

    const clientKey = makeClientKey();
    const normalizedAccept = normalizedAcceptPreview;

    const metadata: ContactShareMetadata = {
      kind: "contact_share_accepted",
      accepted_at: new Date().toISOString(),
      requester: originalMeta.requester,
      responder: {
        name: myDisplayName,
        avatar: myAvatar,
        ...normalizedAccept,
      },
      client_key: clientKey,
    };

    try {
      const tempId = `temp-acc-${clientKey}`;
      setOptimisticMessages((prev) => [
        ...prev,
        {
          id: tempId,
          conversation_id: selectedChat.id,
          content: `Contact share accepted by ${myDisplayName}`,
          created_at: new Date().toISOString(),
          sender_id: "current-user",
          message_type: "contact_share_accepted",
          metadata,
          sender: { id: "current-user", display_name: myDisplayName, avatar_url: myAvatar },
        },
      ]);

      await sendMessage(
        `Contact share accepted by ${myDisplayName}`,
        "contact_share_accepted" as any,
        metadata as any
      );
      setShowAcceptModal({ open: false });
      refetch?.();
    } catch (e) {
      console.error(e);
      alert("Failed to send contact share acceptance.");
    }
  }, [apiMessages, selectedChat, sendMessage, showAcceptModal, myDisplayName, myAvatar, refetch, canSubmitAccept, normalizedAcceptPreview]);

  const declineContactShare = useCallback(
    async (originalMessageId: string) => {
      if (!selectedChat || !sendMessage) return;
      const original = (apiMessages || []).find((m) => m.id === originalMessageId);
      const originalMeta = original?.metadata as ContactShareMetadata | undefined;

      const clientKey = makeClientKey();

      const metadata: ContactShareMetadata = {
        kind: "contact_share_declined",
        declined_at: new Date().toISOString(),
        requester: { name: originalMeta && "requester" in originalMeta ? originalMeta.requester?.name : undefined },
        client_key: clientKey,
      };

      try {
        const tempId = `temp-dec-${clientKey}`;
        setOptimisticMessages((prev) => [
          ...prev,
          {
            id: tempId,
            conversation_id: selectedChat.id,
            content: `Contact share declined.`,
            created_at: new Date().toISOString(),
            sender_id: "current-user",
            message_type: "contact_share_declined",
            metadata,
            sender: { id: "current-user", display_name: myDisplayName, avatar_url: myAvatar },
          },
        ]);

        await sendMessage(`Contact share declined.`, "contact_share_declined" as any, metadata as any);
        refetch?.();
      } catch (e) {
        console.error(e);
        alert("Failed to decline.");
      }
    },
    [apiMessages, selectedChat, sendMessage, myDisplayName, myAvatar, refetch]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      // @ts-expect-error - React.KeyboardEvent의 keyCode는 deprecated이지만 여전히 사용 가능
      if ((e.nativeEvent as any)?.isComposing) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    },
    [sendChatMessage]
  );

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  const filterCounts = {
    all: messages.length,
    messages: messages.filter((m) => m.type === "direct_message" || m.type === "system").length,
    starred: messages.filter((m) => m.isStarred).length,
  };
  const unreadCount = messages.filter((m) => m.status === "unread").length;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const displayMessages = useMemo(() => {
    if (!selectedChat?.id) return [];

    let allMessages = [...(apiMessages || []), ...optimisticMessages];
    allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const result: any[] = [];
    const seenIndexByKey = new Map<string, number>();

    for (const msg of allMessages) {
      const meta = msg.metadata as ContactShareMetadata | undefined;
      const clientKey = (meta as any)?.client_key as string | undefined;
      const isTemp = typeof msg.id === "string" && msg.id.startsWith("temp-");
      const baseKey = clientKey ? `client:${clientKey}` : `id:${msg.id}`;

      if (!seenIndexByKey.has(baseKey)) {
        seenIndexByKey.set(baseKey, result.length);
        result.push(msg);
      } else {
        const idx = seenIndexByKey.get(baseKey)!;
        const existing = result[idx];
        const existingIsTemp = typeof existing.id === "string" && existing.id.startsWith("temp-");
        if (existingIsTemp && !isTemp) result[idx] = msg;
      }
    }

    if (sendingMessage) {
      result.push({
        id: `sending-now`,
        conversation_id: selectedChat.id,
        content: "전송 중...",
        created_at: new Date().toISOString(),
        sender_id: "temp-user",
        receiver_id: selectedChat.other_user?.id || undefined,
        message_type: "text" as const,
        metadata: undefined,
        read_at: undefined,
        sender: {
          id: "temp-user",
          display_name: myDisplayName,
          avatar_url: myAvatar || undefined,
          role: undefined,
        },
      });
    }

    return result.map((msg) => {
      const isCurrentUser =
        msg.sender_id === "temp-user" ||
        msg.sender_id === "current-user" ||
        msg.sender?.display_name === myDisplayName ||
        msg.sender?.avatar_url === myAvatar;

      return {
        id: msg.id,
        content: msg.content,
        timestamp: msg.created_at,
        isFromUser: isCurrentUser,
        message_type: msg.message_type,
        metadata: msg.metadata as ContactShareMetadata | undefined,
      };
    });
  }, [apiMessages, optimisticMessages, selectedChat, sendingMessage, myDisplayName, myAvatar]);

  useEffect(() => {
    if (showChatModal && displayMessages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [displayMessages, showChatModal, scrollToBottom]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-white/70">Loading messages...</div>
      </div>
    );
  }

  // -------------------- 작은 카드 컴포넌트 --------------------

  function ContactCard({ title, info }: { title: string; info: ContactInfo & { name?: string; avatar?: string } }) {
    const Row = ({ label, value }: { label: string; value?: string }) =>
      value ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">{label}</span>
          <span className="text-white/90 truncate max-w-[65%] text-right">{value}</span>
        </div>
      ) : null;

    return (
      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-white/10 overflow-hidden">
            {info.avatar ? <img src={info.avatar} className="h-8 w-8 object-cover" alt="" /> : null}
          </div>
        </div>
        <div className="text-white font-medium mb-2">{info.name || title}</div>
        <div className="space-y-1">
          <Row label="Email" value={info.email} />
          <Row label="Discord" value={info.discord} />
          <Row label="Reddit" value={info.reddit} />
          <Row label="GitHub" value={info.github} />
          <Row label="Website" value={info.website} />
          <Row label="Timezone" value={info.timezone} />
          {info.availability ? (
            <div>
              <div className="text-white/60 text-sm mb-1">Availability</div>
              <div className="text-white/90 text-sm whitespace-pre-wrap">{info.availability}</div>
            </div>
          ) : null}
          {info.note ? (
            <div>
              <div className="text-white/60 text-sm mb-1">Note</div>
              <div className="text-white/90 text-sm whitespace-pre-wrap">{info.note}</div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function MaskedContactCard() {
    return (
      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="text-white font-medium mb-2">Contact details</div>
        <div className="space-y-2 text-sm">
          <div className="h-4 rounded bg-white/10 w-2/3" />
          <div className="h-4 rounded bg-white/10 w-1/2" />
          <div className="h-4 rounded bg-white/10 w-1/3" />
        </div>
        <div className="text-white/60 pt-1">Hidden until you accept.</div>
      </div>
    );
  }

  // ✔ 재사용 가능한 입력 + 'None' 토글
  function InputWithNone({
    label,
    value,
    onChange,
    noneChecked,
    onToggleNone,
    placeholder,
    disabledWhenNone = true,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    noneChecked: boolean;
    onToggleNone: (checked: boolean) => void;
    placeholder?: string;
    disabledWhenNone?: boolean;
  }) {
    return (
      <div>
        <label className="block text-white/90 font-medium mb-2">{label}</label>
        <ImeSafeInput
          value={noneChecked ? "" : value}
          disabled={disabledWhenNone && noneChecked}
          onChange={(v) => onChange(v)}
          autoComplete="off"
          inputMode="text"
          placeholder={placeholder || label}
          className={`w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all ${
            noneChecked ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onKeyDown={(e) => {
            // @ts-expect-error - React.KeyboardEvent의 keyCode는 deprecated이지만 여전히 사용 가능
            if ((e.nativeEvent as any)?.isComposing) return;
            if (e.key === "Enter") e.preventDefault();
          }}
        />
        <label
          className={`mt-2 inline-flex items-center gap-2 text-xs px-2 py-1 rounded-lg border transition-colors select-none ${
            noneChecked
              ? "bg-white/10 text-white border-white/20"
              : "text-white/70 border-white/10 hover:bg-white/5"
          }`}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={noneChecked}
            onChange={(e) => onToggleNone(e.target.checked)}
          />
          <span
            className={`h-3 w-3 rounded-sm border ${
              noneChecked ? "bg-white border-white" : "border-white/40"
            }`}
          />
          None
        </label>
      </div>
    );
  }

  const formKeydownGuard = (e: React.KeyboardEvent) => {
    // @ts-expect-error - React.KeyboardEvent의 keyCode는 deprecated이지만 여전히 사용 가능
    if ((e.nativeEvent as any)?.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) e.preventDefault();
  };

  return (
    <>
      {/* 커스텀 스크롤바 */}
      <style jsx global>{`
        .scrollbar-custom::-webkit-scrollbar { width: 6px; }
        .scrollbar-custom::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 3px; }
        .scrollbar-custom::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.3); border-radius: 3px; }
        .scrollbar-custom::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.5); }
      `}</style>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Messages</h1>
            <p className="text-white/60 mt-1">
              Share contact info securely in chat (no DB storage).
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount} unread</span>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 사이드바 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-4 backdrop-blur">
              <h3 className="text-white font-semibold mb-4">Message Types</h3>
              <div className="space-y-2">
                {[
                  { key: "all", label: "All Messages", icon: MessageCircle },
                  { key: "messages", label: "Direct Messages", icon: MessageCircle },
                  { key: "starred", label: "Starred", icon: Star },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveFilter(key as FilterTab)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      activeFilter === key ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${activeFilter === key ? "bg-black/20" : "bg-white/20"}`}>
                      {filterCounts[key as keyof typeof filterCounts]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <ImeSafeInput
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(v) => setSearchTerm(v)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950/70 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all backdrop-blur"
                autoComplete="off"
              />
            </div>
          </div>

          {/* 메인 리스트 */}
          <div className="lg:col-span-2 space-y-6">
            {conversationsLoading && (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-white/60" />
                <div className="text-white/70 text-sm">Loading conversations...</div>
              </div>
            )}
            {conversationsError && (
              <div className="text-center py-8">
                <div className="text-red-400 mb-2">Error: {conversationsError}</div>
                <div className="text-white/60 text-sm">Failed to load conversations</div>
              </div>
            )}

            {!conversationsLoading && filteredMessages.length > 0 ? (
              <div className="space-y-4">
                {filteredMessages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`bg-zinc-950/70 border rounded-2xl p-6 backdrop-blur transition-all cursor-pointer group hover:bg-zinc-900/50 ${
                      message.status === "unread" ? "border-blue-500/30 bg-blue-500/5" : "border-white/10 hover:border-white/20"
                    } ${selectedChat?.id === message.id ? "ring-2 ring-blue-500/50" : ""}`}
                    onClick={() => openMessage(message)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold shrink-0">
                        {message.from.avatar ? (
                          <img src={message.from.avatar} alt={message.from.name} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          message.from.name.charAt(0)
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-white font-semibold">{message.from.name}</h4>
                              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">
                                <MessageCircle className="h-3 w-3" />
                                direct message
                              </div>
                              {message.isStarred && <Star className="h-3 w-3 text-yellow-400 fill-current" />}
                            </div>
                            <p className="text-white/60 text-sm">{message.from.role}</p>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-white/50">
                            <span>{formatTimestamp(message.timestamp)}</span>
                            {message.status === "unread" && <div className="h-2 w-2 bg-blue-500 rounded-full"></div>}
                          </div>
                        </div>

                        <h3 className={`font-semibold mb-2 ${message.status === "unread" ? "text-white" : "text-white/90"}`}>
                          Chat with {message.from.name}
                        </h3>

                        <p className="text-white/70 text-sm line-clamp-2 mb-4">{message.content}</p>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openMessage(message);
                            }}
                            className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-400 px-3 py-1 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors"
                          >
                            <MessageCircle className="h-3 w-3" />
                            Open Chat
                          </button>
                          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStarMessage(message.id);
                              }}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                            >
                              <Star className={`h-4 w-4 ${message.isStarred ? "text-yellow-400 fill-current" : "text-white/60"}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6">
                  <MessageCircle className="h-12 w-12 text-white/40" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {searchTerm || activeFilter !== "all" ? "No messages found" : "No messages yet"}
                </h3>
                <p className="text-white/60 max-w-md mx-auto">
                  {searchTerm || activeFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "When you start conversations with other users, they'll appear here."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 연락처 공유 모달 */}
        <AnimatePresence>
          {showShareModal && selectedChat && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-zinc-950/95 border border-white/20 rounded-2xl p-6 w-full max-w-2xl backdrop-blur shadow-2xl">
                <form onSubmit={(e) => e.preventDefault()} onKeyDown={formKeydownGuard}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        Share your contact with {selectedChat.other_user?.display_name || "User"}
                      </h3>
                      <p className="text-white/60 text-sm">개인정보는 DB에 저장하지 않고 이 대화에만 표시돼요.</p>
                    </div>
                    <button type="button" onClick={() => setShowShareModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/90 font-medium mb-2">Email</label>
                      <ImeSafeInput
                        value={shareForm.email || ""}
                        onChange={(v) => setShareForm((p) => ({ ...p, email: v }))}
                        autoComplete="email"
                        placeholder="Email"
                        className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-white/90 font-medium mb-2">Timezone</label>
                      <ImeSafeInput
                        value={shareForm.timezone || ""}
                        onChange={(v) => setShareForm((p) => ({ ...p, timezone: v }))}
                        autoComplete="off"
                        placeholder="Timezone"
                        className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all"
                      />
                    </div>

                    <InputWithNone
                      label="Discord"
                      value={shareForm.discord || ""}
                      noneChecked={shareNone.discord}
                      onChange={(v) => setShareForm((p) => ({ ...p, discord: v }))}
                      onToggleNone={(checked) => {
                        setShareNone((n) => ({ ...n, discord: checked }));
                        if (checked) setShareForm((p) => ({ ...p, discord: "" }));
                      }}
                      placeholder="yourDiscord#0000"
                    />
                    <InputWithNone
                      label="Reddit"
                      value={shareForm.reddit || ""}
                      noneChecked={shareNone.reddit}
                      onChange={(v) => setShareForm((p) => ({ ...p, reddit: v }))}
                      onToggleNone={(checked) => {
                        setShareNone((n) => ({ ...n, reddit: checked }));
                        if (checked) setShareForm((p) => ({ ...p, reddit: "" }));
                      }}
                      placeholder="u/yourname"
                    />
                    <InputWithNone
                      label="GitHub"
                      value={shareForm.github || ""}
                      noneChecked={shareNone.github}
                      onChange={(v) => setShareForm((p) => ({ ...p, github: v }))}
                      onToggleNone={(checked) => {
                        setShareNone((n) => ({ ...n, github: checked }));
                        if (checked) setShareForm((p) => ({ ...p, github: "" }));
                      }}
                      placeholder="github.com/yourname"
                    />
                    <InputWithNone
                      label="Website"
                      value={shareForm.website || ""}
                      noneChecked={shareNone.website}
                      onChange={(v) => setShareForm((p) => ({ ...p, website: v }))}
                      onToggleNone={(checked) => {
                        setShareNone((n) => ({ ...n, website: checked }));
                        if (checked) setShareForm((p) => ({ ...p, website: "" }));
                      }}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-white/90 font-medium mb-2">Availability (가능 시간)</label>
                    <ImeSafeTextarea
                      value={shareForm.availability || ""}
                      onChange={(v) => setShareForm((p) => ({ ...p, availability: v }))}
                      rows={3}
                      placeholder="예) 평일 20-23시, 주말 오후..."
                      className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all resize-none"
                    />
                    <label className="block text-white/90 font-medium mb-2 mt-4">Note (한마디)</label>
                    <ImeSafeTextarea
                      value={shareForm.note || ""}
                      onChange={(v) => setShareForm((p) => ({ ...p, note: v }))}
                      rows={2}
                      placeholder="간단한 인사말 등"
                      className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6">
                    <button type="button" onClick={() => setShowShareModal(false)} className="px-6 py-2 text-white/70 hover:text-white transition-colors">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitContactShareRequest}
                      disabled={!canSubmitShare}
                      className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-2 rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Users className="h-4 w-4" />
                      Share my contact
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 채팅 모달 */}
        <AnimatePresence>
          {showChatModal && selectedChat && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-zinc-950/95 border border-white/20 rounded-2xl w-full max-w-3xl h-[80vh] backdrop-blur flex flex-col">
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                        {selectedChat.other_user?.avatar_url ? (
                          <img src={selectedChat.other_user.avatar_url} alt={selectedChat.other_user.display_name} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          (selectedChat.other_user?.display_name || "U").charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white">{selectedChat.other_user?.display_name || "User"}</h3>
                        <p className="text-white/60 text-sm">{selectedChat.other_user?.role || "Role not specified"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowShareModal(true)}
                        className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-500/30 transition-colors"
                      >
                        <Users className="h-4 w-4" />
                        Start Project Together
                      </button>
                      <button type="button" onClick={closeChatModal} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-4 scrollbar-custom">
                  {messagesLoading && (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-white/60" />
                      <div className="text-white/70 text-sm">Loading messages...</div>
                    </div>
                  )}

                  {displayMessages.length === 0 && !messagesLoading && <div className="text-center py-8 text-white/60">Start conversation! 👋</div>}

                  {displayMessages.map((chatMsg, index) => {
                    const meta = chatMsg.metadata as ContactShareMetadata | undefined;

                    if (meta?.kind === "contact_share_request") {
                      const isRecipient = !chatMsg.isFromUser;
                      return (
                        <motion.div key={`${chatMsg.id}-${index}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className={`flex ${isRecipient ? "justify-start" : "justify-end"}`}>
                          {!isRecipient && (
                            <div className="max-w-[70%] text-right">
                              <div className="p-4 rounded-2xl border-2 bg-green-500/10 border-green-500/30 text-white">
                                <div className="font-semibold mb-2">Contact share request</div>
                                <ContactCard title="Requester" info={meta.requester} />
                                <div className="mt-3 p-2 bg-yellow-500/20 rounded-lg text-yellow-300 text-sm">
                                  Waiting for the other person to accept…
                                </div>
                              </div>
                              <p className="text-xs text-white/50 mt-1 text-right">{formatTimestamp(chatMsg.timestamp)}</p>
                            </div>
                          )}
                          {isRecipient && (
                            <div className="max-w-[70%] text-left">
                              <div className="p-4 rounded-2xl border-2 bg-blue-500/10 border-blue-500/30 text-white">
                                <div className="font-semibold mb-2">Contact share request</div>
                                <MaskedContactCard />
                                <div className="flex gap-2 mt-3">
                                  <button
                                    type="button"
                                    onClick={() => setShowAcceptModal({ open: true, originalMessageId: chatMsg.id })}
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => declineContactShare(chatMsg.id)}
                                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-white/50 mt-1">{formatTimestamp(chatMsg.timestamp)}</p>
                            </div>
                          )}
                        </motion.div>
                      );
                    }

                    if (meta?.kind === "contact_share_accepted") {
                      return (
                        <motion.div key={`${chatMsg.id}-${index}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className="flex justify-center">
                          <div className="max-w-[85%] w-full text-left">
                            <div className="p-4 rounded-2xl border-2 bg-emerald-500/10 border-emerald-500/30 text-white">
                              <div className="font-semibold mb-3">Contact info exchanged ✅</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <ContactCard title="Requester" info={meta.requester} />
                                <ContactCard title="Responder" info={meta.responder} />
                              </div>
                            </div>
                            <p className="text-xs text-white/50 mt-1">{formatTimestamp(chatMsg.timestamp)}</p>
                          </div>
                        </motion.div>
                      );
                    }

                    if (meta?.kind === "contact_share_declined") {
                      const alignClass = chatMsg.isFromUser ? "justify-end" : "justify-start";
                      const textAlign = chatMsg.isFromUser ? "text-right" : "text-left";
                      return (
                        <motion.div key={`${chatMsg.id}-${index}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className={`flex ${alignClass}`}>
                          <div className={`max-w-[70%] ${textAlign}`}>
                            <div className="p-4 rounded-2xl border-2 bg-red-500/10 border-red-500/30 text-white">
                              <div className="font-semibold mb-2">Contact share declined</div>
                              <div className="text-white/80 text-sm">Maybe later!</div>
                            </div>
                            <p className="text-xs text-white/50 mt-1">{formatTimestamp(chatMsg.timestamp)}</p>
                          </div>
                        </motion.div>
                      );
                    }

                    const align = chatMsg.isFromUser ? "justify-end" : "justify-start";
                    const bubble =
                      chatMsg.isFromUser
                        ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-zinc-900/80 text-white border border-white/10 rounded-bl-md";

                    return (
                      <motion.div
                        key={`${chatMsg.id}-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`flex items-end gap-3 ${align}`}
                      >
                        {!chatMsg.isFromUser && (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                            {selectedChat.other_user?.avatar_url ? (
                              <img src={selectedChat.other_user.avatar_url} alt={selectedChat.other_user.display_name} className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              (selectedChat.other_user?.display_name || "U").charAt(0)
                            )}
                          </div>
                        )}

                        <div className={`max-w-[70%] ${chatMsg.isFromUser ? "text-right" : "text-left"}`}>
                          <div className={`inline-block p-4 rounded-2xl max-w-full break-words ${bubble}`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{chatMsg.content}</p>
                          </div>
                          <p className={`text-xs text-white/50 mt-1 ${chatMsg.isFromUser ? "text-right" : "text-left"}`}>
                            {formatTimestamp(chatMsg.timestamp)}
                          </p>
                        </div>

                        {chatMsg.isFromUser && (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-400 to-blue-400 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                            {user?.imageUrl ? <img src={user.imageUrl} alt="You" className="h-8 w-8 rounded-full object-cover" /> : (user?.firstName?.charAt(0) || "Y")}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                </div>

                <div className="p-6 border-t border-white/10">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <ImeSafeTextarea
                        value={newMessage}
                        onChange={(v) => setNewMessage(v)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your message..."
                        rows={1}
                        className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all resize-none min-h-[48px] max-h-[120px]"
                        style={{ height: "auto", minHeight: "48px", maxHeight: "120px" }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = Math.min(target.scrollHeight, 120) + "px";
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={sendChatMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {sendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-white/50 mt-2">Press Enter to send, Shift+Enter for new line</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 수락(내 연락처 입력) 모달 */}
        <AnimatePresence>
          {showAcceptModal.open && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-zinc-950/95 border border-white/20 rounded-2xl p-6 w-full max-w-2xl backdrop-blur shadow-2xl">
                <form onSubmit={(e) => e.preventDefault()} onKeyDown={formKeydownGuard}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white">Share your contact to accept</h3>
                      <p className="text-white/60 text-sm">이 정보는 대화에만 표시돼요.</p>
                    </div>
                    <button type="button" onClick={() => setShowAcceptModal({ open: false })} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/90 font-medium mb-2">Email</label>
                      <ImeSafeInput
                        value={acceptForm.email || ""}
                        onChange={(v) => setAcceptForm((p) => ({ ...p, email: v }))}
                        autoComplete="email"
                        placeholder="Email"
                        className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-white/90 font-medium mb-2">Timezone</label>
                      <ImeSafeInput
                        value={acceptForm.timezone || ""}
                        onChange={(v) => setAcceptForm((p) => ({ ...p, timezone: v }))}
                        autoComplete="off"
                        placeholder="Timezone"
                        className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all"
                      />
                    </div>

                    <InputWithNone
                      label="Discord"
                      value={acceptForm.discord || ""}
                      noneChecked={acceptNone.discord}
                      onChange={(v) => setAcceptForm((p) => ({ ...p, discord: v }))}
                      onToggleNone={(checked) => {
                        setAcceptNone((n) => ({ ...n, discord: checked }));
                        if (checked) setAcceptForm((p) => ({ ...p, discord: "" }));
                      }}
                      placeholder="yourDiscord#0000"
                    />
                    <InputWithNone
                      label="Reddit"
                      value={acceptForm.reddit || ""}
                      noneChecked={acceptNone.reddit}
                      onChange={(v) => setAcceptForm((p) => ({ ...p, reddit: v }))}
                      onToggleNone={(checked) => {
                        setAcceptNone((n) => ({ ...n, reddit: checked }));
                        if (checked) setAcceptForm((p) => ({ ...p, reddit: "" }));
                      }}
                      placeholder="u/yourname"
                    />
                    <InputWithNone
                      label="GitHub"
                      value={acceptForm.github || ""}
                      noneChecked={acceptNone.github}
                      onChange={(v) => setAcceptForm((p) => ({ ...p, github: v }))}
                      onToggleNone={(checked) => {
                        setAcceptNone((n) => ({ ...n, github: checked }));
                        if (checked) setAcceptForm((p) => ({ ...p, github: "" }));
                      }}
                      placeholder="github.com/yourname"
                    />
                    <InputWithNone
                      label="Website"
                      value={acceptForm.website || ""}
                      noneChecked={acceptNone.website}
                      onChange={(v) => setAcceptForm((p) => ({ ...p, website: v }))}
                      onToggleNone={(checked) => {
                        setAcceptNone((n) => ({ ...n, website: checked }));
                        if (checked) setAcceptForm((p) => ({ ...p, website: "" }));
                      }}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-white/90 font-medium mb-2">Availability</label>
                    <ImeSafeTextarea
                      value={acceptForm.availability || ""}
                      onChange={(v) => setAcceptForm((p) => ({ ...p, availability: v }))}
                      rows={3}
                      placeholder="ex)Weekdays 8–11 PM, Weekend afternoons.."
                      className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all resize-none"
                    />
                    <label className="block text-white/90 font-medium mb-2 mt-4">Note</label>
                    <ImeSafeTextarea
                      value={acceptForm.note || ""}
                      onChange={(v) => setAcceptForm((p) => ({ ...p, note: v }))}
                      rows={2}
                      placeholder="simple greeting"
                      className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6">
                    <button type="button" onClick={() => setShowAcceptModal({ open: false })} className="px-6 py-2 text-white/70 hover:text-white transition-colors">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitAcceptContactShare}
                      disabled={!canSubmitAccept}
                      className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-2 rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Accept & Share
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
