"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowUp,
  Bot,
  LoaderCircle,
  MessageCircle,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { sendAiChatMessage } from "@/service/ai-chat.service";
import type { AiChatProduct } from "@/service/ai-chat.service";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  products?: AiChatProduct[];
};

const suggestions = [
  "Help me find a T-shirt",
  "What products do you recommend?",
  "What is your shipping policy?",
];

const formatPrice = (value: string | null | undefined) => {
  if (!value) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

function ProductRecommendation({ product }: { product: AiChatProduct }) {
  const price = formatPrice(product.salePrice) ?? formatPrice(product.regularPrice);
  const regularPrice = product.salePrice ? formatPrice(product.regularPrice) : null;
  const available = product.stockQuantity > 0;

  return (
    <article className="flex min-w-0 gap-3 rounded-xl border border-stone-200 bg-white p-2.5 text-stone-900">
      <Link
        href={`/products/${encodeURIComponent(product.id)}`}
        className="relative size-[76px] shrink-0 overflow-hidden rounded-lg bg-stone-100"
        aria-label={`View ${product.name}`}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="76px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full items-center justify-center text-stone-400">
            <Bot size={24} />
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1 py-0.5">
        <p className="line-clamp-1 text-xs text-stone-500">
          {product.brand || product.category}
        </p>
        <Link
          href={`/products/${encodeURIComponent(product.id)}`}
          className="mt-0.5 line-clamp-2 text-sm font-semibold leading-5 hover:underline"
        >
          {product.name}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {price && <span className="text-sm font-bold">{price}</span>}
          {regularPrice && (
            <span className="text-xs text-stone-400 line-through">{regularPrice}</span>
          )}
          <span className={`text-[10px] ${available ? "text-emerald-700" : "text-rose-600"}`}>
            {available ? "In stock" : "Out of stock"}
          </span>
        </div>
      </div>
    </article>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex items-start gap-2.5 ${isAssistant ? "" : "flex-row-reverse"}`}>
      {isAssistant && (
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white">
          <Sparkles size={14} />
        </span>
      )}
      <div className={`min-w-0 max-w-[86%] space-y-2 ${isAssistant ? "" : "text-right"}`}>
        <div
          className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-left text-sm leading-6 ${
            isAssistant
              ? "rounded-tl-md bg-stone-100 text-stone-800"
              : "rounded-tr-md bg-stone-900 text-white"
          }`}
        >
          {message.content}
        </div>
        {isAssistant && message.products && message.products.length > 0 && (
          <div className="space-y-2 text-left">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Recommended products
            </p>
            {message.products.map((product) => (
              <ProductRecommendation key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AiShoppingChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your shopping assistant. Tell me what you're looking for, or ask me about our products and store policies.",
    },
  ]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // The widget is safe to mount in a shared layout; keep it out of admin screens.
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    scrollAreaRef.current?.scrollTo({
      top: scrollAreaRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isOpen, isMinimized, isSending]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      const timeout = window.setTimeout(() => inputRef.current?.focus(), 100);
      return () => window.clearTimeout(timeout);
    }
  }, [isOpen, isMinimized]);

  if (isAdminRoute) return null;

  const submitMessage = async (rawMessage: string, appendUserMessage = true) => {
    const message = rawMessage.trim();
    if (!message || isSending) return;

    setError("");
    setInput("");
    if (appendUserMessage) {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", content: message },
      ]);
    }
    setIsSending(true);

    try {
      const result = await sendAiChatMessage(message);

      if (!result.success) {
        setError(result.message);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.data.answer,
          products: result.data.products,
        },
      ]);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitMessage(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage(input);
    }
  };

  const retryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (lastUserMessage) void submitMessage(lastUserMessage.content, false);
  };

  const resetConversation = () => {
    setError("");
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi! I'm your shopping assistant. Tell me what you're looking for, or ask me about our products and store policies.",
      },
    ]);
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen && !isMinimized && (
        <section
          aria-label="AI shopping assistant"
          aria-live="polite"
          className="pointer-events-auto flex h-[min(680px,calc(100dvh-112px))] w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-stone-950 shadow-2xl shadow-stone-950/15 sm:h-[min(700px,calc(100dvh-120px))] sm:w-[400px]"
        >
          <header className="flex shrink-0 items-center justify-between bg-stone-950 px-4 py-3.5 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Sparkles size={19} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">Shopping Assistant</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-stone-300">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Here to help you shop
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetConversation}
                aria-label="Start a new conversation"
                title="New conversation"
                className="flex size-9 items-center justify-center rounded-full text-stone-300 transition hover:bg-white/10 hover:text-white"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                aria-label="Minimize chat"
                className="flex size-9 items-center justify-center rounded-full text-stone-300 transition hover:bg-white/10 hover:text-white"
              >
                <Minus size={18} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="flex size-9 items-center justify-center rounded-full text-stone-300 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div ref={scrollAreaRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-white px-3.5 py-4 sm:px-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isSending && (
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-full bg-stone-900 text-white">
                  <Sparkles size={14} />
                </span>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-stone-100 px-3.5 py-3 text-xs text-stone-500">
                  <LoaderCircle size={14} className="animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="ml-9 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={retryLastMessage}
                  disabled={isSending}
                  className="mt-2 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2 disabled:opacity-50"
                >
                  <RotateCcw size={12} /> Try again
                </button>
              </div>
            )}

            {messages.length === 1 && !isSending && (
              <div className="ml-9 space-y-2 pt-1">
                <p className="text-[11px] font-medium text-stone-400">TRY ASKING</p>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void submitMessage(suggestion)}
                    className="block max-w-full rounded-full border border-stone-200 px-3 py-2 text-left text-xs text-stone-600 transition hover:border-stone-400 hover:bg-stone-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="shrink-0 border-t border-stone-200 bg-white p-3.5">
            <div className="flex items-end gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-2 focus-within:border-stone-400 focus-within:ring-2 focus-within:ring-stone-200">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 1000))}
                onKeyDown={handleKeyDown}
                placeholder="Ask about products or policies..."
                aria-label="Write a message"
                rows={1}
                maxLength={1000}
                className="max-h-28 min-h-9 min-w-0 flex-1 resize-y bg-transparent px-1.5 py-2 text-sm leading-5 text-stone-900 outline-none placeholder:text-stone-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                aria-label="Send message"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-stone-950 text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {isSending ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowUp size={18} />}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-stone-400">
              <span>AI can make mistakes. Check important details.</span>
              <span>{input.length}/1000</span>
            </div>
          </form>
        </section>
      )}

      {isOpen && isMinimized && (
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-xl"
        >
          <Sparkles size={16} /> Shopping Assistant <Plus size={15} />
        </button>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label="Open AI shopping assistant"
          className="pointer-events-auto group flex size-14 items-center justify-center rounded-full bg-stone-950 text-white shadow-xl shadow-stone-950/20 transition hover:-translate-y-1 hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-300 sm:size-16"
        >
          <MessageCircle size={25} strokeWidth={1.8} className="transition group-hover:scale-105" />
        </button>
      )}
    </div>
  );
}
