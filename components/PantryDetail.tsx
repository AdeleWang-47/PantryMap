"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Pantry } from "@/lib/pantry-types";
import { StockGauge } from "@/components/StockGauge";
import type { StockInfo } from "@/lib/pantry-types";
import {
  fetchRecentDonations,
  type Donation,
  fetchWishlist,
  type WishlistItem,
  addWishlistItem,
  fetchMessages,
  type MessageItem,
  postMessage,
  fetchLiveTelemetryStock,
} from "@/lib/pantry-api";

/* ─── constants ───────────────────────────────────────────────── */
const PHOTO_PLACEHOLDER = "/pantry-placeholder.svg";

const DONATION_SIZE_LABELS: Record<string, string> = {
  low_donation: "ONE OR FEW ITEMS",
  medium_donation: "ABOUT 1 GROCERY BAG",
  high_donation: "MORE THAN 1 GROCERY BAG",
};

const DONATION_CATEGORIES = [
  "Canned & jarred food (canned soup, beans, etc.)",
  "Dry goods (pasta, rice, etc.)",
  "Fresh food (produce, fruits, etc.)",
  "Cooked & ready-to-eat food (sandwiches, etc.)",
  "Beverages (bottled water, juice boxes, etc.)",
  "Breakfast & snack food (cereal, granola bars, etc.)",
  "Baby & child items (diapers, baby wipes, etc.)",
  "Personal hygiene & health items (toothbrushes, pain relievers, etc.)",
  "Household essentials (paper towels, laundry detergent, etc.)",
  "Clothing items (blankets, socks, etc.)",
  "Other",
];

/* ─── helpers ─────────────────────────────────────────────────── */
function computePantryTypeLabel(pantry: Pantry): string {
  const t = String(pantry.pantryType || "").toLowerCase();
  if (t === "fridge" || t === "shelf+fridge") return "Community fridge";
  if (t === "shelf") return "Shelf-stable micropantry";
  return "Pantry";
}

function formatDateTimeMinutes(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatRelativeTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDateTimeMinutes(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDateTimeMinutes(iso);
}

function getInitial(name: string): string {
  const t = (name || "").trim();
  return t ? t[0].toUpperCase() : "?";
}

/* ─── Wishlist bubble-pack visualization ─────────────────────── */
interface PlacedCircle { x: number; y: number; r: number; }
interface CircleInput { item: WishlistItem; r: number; }

function computeCirclePack(circles: CircleInput[]): { placed: PlacedCircle[]; width: number; height: number } {
  const padding = 10;
  const placed: PlacedCircle[] = [];
  const centerX = 150;
  const centerY = 150;
  const sorted = circles.slice().sort((a, b) => b.r - a.r);

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i].r;
    let x = centerX, y = centerY;
    if (i > 0) {
      let found = false;
      for (let t = 0; t < 400 && !found; t++) {
        const angle = t * 0.55;
        const dist = 35 + t * 2.2;
        const tx = centerX + dist * Math.cos(angle);
        const ty = centerY + dist * Math.sin(angle);
        let ok = true;
        for (const p of placed) {
          if (Math.hypot(tx - p.x, ty - p.y) < r + p.r + 2) { ok = false; break; }
        }
        if (ok) { x = tx; y = ty; found = true; }
      }
      if (!found) { x = centerX + (i % 3) * 45; y = centerY + Math.floor(i / 3) * 45; }
    }
    placed.push({ x, y, r });
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of placed) {
    minX = Math.min(minX, p.x - p.r);
    minY = Math.min(minY, p.y - p.r);
    maxX = Math.max(maxX, p.x + p.r);
    maxY = Math.max(maxY, p.y + p.r);
  }
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  return {
    placed: placed.map((p) => ({ x: p.x - minX + padding, y: p.y - minY + padding, r: p.r })),
    width,
    height,
  };
}

interface WishlistBubblePackProps {
  items: WishlistItem[];
  onBubbleClick: (item: WishlistItem) => void;
}

const WishlistBubblePack: React.FC<WishlistBubblePackProps> = ({ items, onBubbleClick }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const circles: CircleInput[] = items.map((item) => {
    const qty = Number.isFinite(item.count) && item.count > 0 ? item.count : 1;
    const r = Math.max(28, 16 + Math.min(qty, 12) * 5);
    return { item, r };
  });

  const pack = computeCirclePack(circles);
  // sorted order matches placed[] order from computeCirclePack
  const sortedCircles = circles.slice().sort((a, b) => b.r - a.r);

  // Scale inner to fit available width
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;
    const w = wrapper.offsetWidth || pack.width;
    const scale = w / pack.width;
    inner.style.transform = `scale(${scale})`;
    inner.style.transformOrigin = "top left";
    wrapper.style.height = pack.height * scale + "px";
  });

  if (items.length === 0) {
    return <div className="wishlist-empty">No wishlist items yet.</div>;
  }

  return (
    <div ref={wrapperRef} className="wishlist-bubble-pack">
      <div
        ref={innerRef}
        className="wishlist-bubble-pack-inner"
        style={{ width: pack.width, height: pack.height, position: "relative" }}
      >
        {pack.placed.map((pos, i) => {
          const { item } = sortedCircles[i];
          const label = String(item.itemDisplay ?? "Item");
          const fontSize = Math.max(9, Math.min(13, pos.r * 0.42));
          const ts = item.updatedAt ?? null;
          return (
            <button
              key={item.id ?? i}
              type="button"
              className="wishlist-bubble"
              title={ts ? `Updated ${formatRelativeTimestamp(ts)}` : label}
              style={{
                left: pos.x - pos.r,
                top: pos.y - pos.r,
                width: pos.r * 2,
                height: pos.r * 2,
                fontSize,
              }}
              onClick={() => onBubbleClick(item)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Donor Note Modal ────────────────────────────────────────── */
interface DonorNoteModalProps {
  onClose: () => void;
  onSubmit: (size: string, categories: string[], note: string) => Promise<void>;
}

const DonorNoteModal: React.FC<DonorNoteModalProps> = ({ onClose, onSubmit }) => {
  const [size, setSize] = useState("");
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleCategory = (cat: string) => {
    setCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!size) { setError("Please select how much you are donating in total."); return; }
    setSubmitting(true);
    try {
      await onSubmit(size, Array.from(categories), note);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="donor-note-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="donor-note-modal" role="dialog" aria-modal="true">
        <button type="button" className="donor-note-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3>Report a donation</h3>
        <p className="donor-note-modal-hint">Please describe below what you are donating</p>
        <form className="donor-note-form" onSubmit={handleSubmit}>
          <label>
            <span>How much are you donating in total?</span>
            <select name="donationSize" required value={size} onChange={(e) => setSize(e.target.value)} disabled={submitting}>
              <option value="">Select size...</option>
              <option value="low_donation">ONE OR FEW ITEMS</option>
              <option value="medium_donation">ABOUT 1 GROCERY BAG</option>
              <option value="high_donation">MORE THAN 1 GROCERY BAG</option>
            </select>
          </label>
          <div>
            <span className="donor-note-categories-title">What are you donating? Select all that apply</span>
            <div className="donor-note-categories-list">
              {DONATION_CATEGORIES.map((cat) => (
                <label key={cat} className="donor-note-category-item" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={categories.has(cat)}
                    onChange={() => toggleCategory(cat)}
                    disabled={submitting}
                    style={{ flexShrink: 0, width: "16px", height: "16px", margin: 0, cursor: "pointer" }}
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          </div>
          <label>
            <span>Leave a message (optional)</span>
            <textarea
              name="message"
              rows={3}
              placeholder="Leave a message (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
            />
          </label>
          {error && <div className="donor-note-modal-error">{error}</div>}
          <div className="donor-note-modal-actions">
            <button type="button" className="donor-note-modal-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="donor-note-modal-submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body!
  );
};

/* ─── Wishlist Modal ──────────────────────────────────────────── */
interface WishlistModalProps {
  onClose: () => void;
  onSubmit: (item: string) => Promise<void>;
}

const WishlistModal: React.FC<WishlistModalProps> = ({ onClose, onSubmit }) => {
  const [item, setItem] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = item.trim();
    if (!trimmed) { setError("Please enter an item name."); return; }
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to add item. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wishlist-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wishlist-modal" role="dialog" aria-modal="true">
        <button type="button" className="wishlist-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3>Add item to wishlist</h3>
        <form className="wishlist-form" onSubmit={handleSubmit}>
          <label>
            <span>Item name</span>
            <input
              ref={inputRef}
              type="text"
              name="item"
              maxLength={60}
              required
              placeholder="e.g. Rice"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              disabled={submitting}
            />
          </label>
          <p className="wishlist-modal-hint">Items stay visible for 7 days.</p>
          {error && <div className="wishlist-modal-error">{error}</div>}
          <div className="wishlist-modal-actions">
            <button type="button" className="wishlist-modal-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="wishlist-modal-submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add item"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body!
  );
};

/* ─── Message Modal ───────────────────────────────────────────── */
interface MessageModalProps {
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
}

const MessageModal: React.FC<MessageModalProps> = ({ onClose, onSubmit }) => {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = content.trim();
    if (!trimmed) { setError("Please enter your message."); return; }
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to post message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="wishlist-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wishlist-modal" role="dialog" aria-modal="true">
        <button type="button" className="wishlist-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3>Leave a message</h3>
        <form className="wishlist-form message-form" onSubmit={handleSubmit}>
          <label>
            <span>Your message</span>
            <textarea
              name="content"
              maxLength={500}
              required
              rows={4}
              placeholder="Leave your message to the host and the community..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting}
            />
          </label>
          {error && <div className="wishlist-modal-error">{error}</div>}
          <div className="wishlist-modal-actions">
            <button type="button" className="wishlist-modal-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="wishlist-modal-submit" disabled={submitting}>
              {submitting ? "Posting…" : "Post message"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body!
  );
};

/* ─── PantryDetail ────────────────────────────────────────────── */
export interface PantryDetailProps {
  pantry: Pantry;
}

export const PantryDetail: React.FC<PantryDetailProps> = ({ pantry }) => {
  const photosArr = Array.isArray(pantry.photos) ? pantry.photos : [];
  const photoUrl = photosArr.length > 0 ? photosArr[0] : "";
  const addressText = pantry.address || "Address unknown";
  const pantryTypeLabel = computePantryTypeLabel(pantry);
  // Live telemetry overrides the stale stock baked into the pantry document.
  // This is critical for sensor-connected pantries (e.g. pantry 4015).
  const [liveStock, setLiveStock] = useState<StockInfo | null>(null);
  useEffect(() => {
    setLiveStock(null);
    fetchLiveTelemetryStock(pantry.id).then((s) => {
      if (s) setLiveStock(s);
    });
  }, [pantry.id]);
  const stock = liveStock ?? pantry.stock ?? null;

  /* ── Donations ─────────────────────────────────────── */
  const [donations, setDonations] = useState<Donation[] | null>(null);
  const [donationsError, setDonationsError] = useState<string | null>(null);
  const [donorExpanded, setDonorExpanded] = useState(false);
  const [showDonorModal, setShowDonorModal] = useState(false);

  /* ── Wishlist ──────────────────────────────────────── */
  const [wishlist, setWishlist] = useState<WishlistItem[] | null>(null);
  const [wishlistError, setWishlistError] = useState<string | null>(null);
  const [showWishlistModal, setShowWishlistModal] = useState(false);

  /* ── Messages ──────────────────────────────────────── */
  const [messages, setMessages] = useState<MessageItem[] | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesExpanded, setMessagesExpanded] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  const loadDonations = () => {
    setDonations(null);
    setDonationsError(null);
    fetchRecentDonations(pantry.id)
      .then((items) => setDonations(items))
      .catch((err) => setDonationsError(err?.message || "Failed to load"));
  };

  useEffect(() => {
    loadDonations();
    fetchWishlist(pantry.id)
      .then(setWishlist)
      .catch((err) => setWishlistError(err?.message || "Failed to load wishlist"));
    fetchMessages(pantry.id)
      .then(setMessages)
      .catch((err) => setMessagesError(err?.message || "Failed to load messages"));
  }, [pantry.id]);

  const DONOR_FLAT = 3;
  const hasDonations = Array.isArray(donations) && donations.length > 0;
  const visibleDonations = hasDonations
    ? donorExpanded ? donations! : donations!.slice(0, DONOR_FLAT)
    : [];

  const MSG_FLAT = 3;
  const hasMessages = Array.isArray(messages) && messages.length > 0;
  const visibleMessages = hasMessages
    ? messagesExpanded ? messages! : messages!.slice(0, MSG_FLAT)
    : [];

  /* ── handlers ──────────────────────────────────────── */
  const handleDonationSubmit = async (size: string, categories: string[], note: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_PANTRY_API_BASE_URL || "http://localhost:7071/api";
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/donations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pantryId: pantry.id,
        donationSize: size,
        donationItems: categories.length > 0 ? categories : undefined,
        note: note || undefined,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed (${res.status})`);
    }
    loadDonations();
  };

  const handleWishlistSubmit = async (item: string) => {
    await addWishlistItem(pantry.id, item, 1);
    const items = await fetchWishlist(pantry.id);
    setWishlist(items);
  };

  const handleBubbleClick = useCallback(async (item: WishlistItem) => {
    try {
      await addWishlistItem(pantry.id, item.itemDisplay, 1);
      const items = await fetchWishlist(pantry.id);
      setWishlist(items);
    } catch (err) {
      console.error("Error re-adding wishlist item:", err);
    }
  }, [pantry.id]);

  const handleMessageSubmit = async (content: string) => {
    await postMessage(pantry.id, content);
    const items = await fetchMessages(pantry.id);
    setMessages(items);
  };

  return (
    <>
      {/* ── Modals (rendered outside scroll container via fixed positioning) */}
      {showDonorModal && (
        <DonorNoteModal
          onClose={() => setShowDonorModal(false)}
          onSubmit={handleDonationSubmit}
        />
      )}
      {showWishlistModal && (
        <WishlistModal
          onClose={() => setShowWishlistModal(false)}
          onSubmit={handleWishlistSubmit}
        />
      )}
      {showMessageModal && (
        <MessageModal
          onClose={() => setShowMessageModal(false)}
          onSubmit={handleMessageSubmit}
        />
      )}

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="detail-hero">
        <div className="detail-hero-cover">
          <img
            src={photoUrl || PHOTO_PLACEHOLDER}
            alt={pantry.name || "Pantry photo"}
            className="detail-hero-img"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PHOTO_PLACEHOLDER; }}
          />
          <span className="detail-hero-badge">{pantryTypeLabel}</span>
        </div>
        <div className="detail-hero-body">
          <h1 className="detail-title">{pantry.name || "Untitled Pantry"}</h1>
          <div className="detail-subline">{addressText}</div>
        </div>
      </div>

      {/* ── Stock ────────────────────────────────────────── */}
      <section className="detail-section stock-section">
        <div className="stock-card">
          <StockGauge stock={stock} noUpdateAvailable={!stock?.lastUpdateIso} />
        </div>
      </section>

      {/* ── Donor Notes ──────────────────────────────────── */}
      <section className="detail-section donor-notes-section">
        <h2>Post a Donation</h2>
        <button
          type="button"
          className="donor-notes-cta"
          onClick={() => setShowDonorModal(true)}
        >
          Report your donation here!
        </button>
        <div className="donor-notes-latest">
          {!donations && !donationsError && <div className="donor-note-empty">Loading…</div>}
          {donationsError && <div className="donor-note-empty">Failed to load donations.</div>}
          {donations && donations.length === 0 && !donationsError && (
            <div className="donor-note-empty">No donations reported in the last 24 hours.</div>
          )}
          {hasDonations && visibleDonations.map((d, idx) => {
            const sizeLabel = d.donationSize ? (DONATION_SIZE_LABELS[d.donationSize] || d.donationSize) : null;
            const donationItems = Array.isArray(d.donationItems) ? d.donationItems : [];
            const ts = d.createdAt ?? d.created_at ?? d.timestamp ?? d.updatedAt ?? null;

            return (
              <article key={d.id ?? idx} className="donor-note-card">
                {Array.isArray(d.photoUrls) && d.photoUrls.length > 0 && (
                  <div className="donor-note-media">
                    <img
                      src={d.photoUrls[0]}
                      alt="Donation photo"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = PHOTO_PLACEHOLDER; }}
                    />
                  </div>
                )}
                {sizeLabel && (
                  <p className="donor-note-text"><strong>Amount:</strong> {sizeLabel}</p>
                )}
                {donationItems.length > 0 && (
                  <div className="donor-note-text donor-note-items">
                    <strong>Items:</strong>
                    <div className="donor-note-chips">
                      {donationItems.map((it, i) => (
                        <span key={i} className="donor-note-chip">{it}</span>
                      ))}
                    </div>
                  </div>
                )}
                {d.note && <p className="donor-note-text">{d.note}</p>}
                {ts && (
                  <time className="donor-note-time" dateTime={ts}>
                    {formatRelativeTimestamp(ts)}
                  </time>
                )}
              </article>
            );
          })}
        </div>
        {hasDonations && donations!.length > DONOR_FLAT && (
          <button
            type="button"
            className="section-link donor-notes-toggle"
            onClick={() => setDonorExpanded((v) => !v)}
          >
            {donorExpanded ? "Collapse" : `View more (${donations!.length - DONOR_FLAT} more)`}
          </button>
        )}
      </section>

      {/* ── Wishlist ─────────────────────────────────────── */}
      <section className="detail-section detail-card-section">
        <div className="detail-card-head section-heading-row">
          <h2>Pantry Wishlist</h2>
          <button
            type="button"
            className="wishlist-add"
            aria-label="Add wishlist item"
            onClick={() => setShowWishlistModal(true)}
          >
            +
          </button>
        </div>
        <div className="wishlist-grid">
          {!wishlist && !wishlistError && <div className="wishlist-empty">Loading wishlist…</div>}
          {wishlistError && <div className="wishlist-empty">Failed to load wishlist.</div>}
          {wishlist && (
            <WishlistBubblePack
              items={wishlist}
              onBubbleClick={handleBubbleClick}
            />
          )}
        </div>
      </section>

      {/* ── Messages ─────────────────────────────────────── */}
      <section className="detail-section detail-card-section message-section">
        <h2>Leave a message</h2>
        <button
          type="button"
          className="message-cta"
          onClick={() => setShowMessageModal(true)}
        >
          Leave a message to the host and the community
        </button>
        <div className="message-list">
          {!messages && !messagesError && <div className="message-empty">Loading messages…</div>}
          {messagesError && <div className="message-empty">Failed to load messages.</div>}
          {messages && messages.length === 0 && !messagesError && (
            <div className="message-empty">No messages yet.</div>
          )}
          {hasMessages && visibleMessages.map((m, idx) => {
            const displayName = (m.userName || "").trim() || "Community member";
            const ts = m.createdAt ?? m.created_at ?? m.timestamp ?? m.updatedAt ?? null;

            return (
              <article key={m.id ?? idx} className="message-card">
                <div className="message-avatar">
                  {m.userAvatar
                    ? <img src={m.userAvatar} alt={displayName} />
                    : getInitial(displayName)
                  }
                </div>
                <div className="message-body">
                  <h3>{displayName}</h3>
                  {m.content && <p>{m.content}</p>}
                  {ts && <time dateTime={ts}>{formatRelativeTimestamp(ts)}</time>}
                </div>
              </article>
            );
          })}
        </div>
        {hasMessages && messages!.length > MSG_FLAT && (
          <button
            type="button"
            className="section-link message-toggle"
            onClick={() => setMessagesExpanded((v) => !v)}
          >
            {messagesExpanded ? "Collapse" : `View more (${messages!.length - MSG_FLAT} more)`}
          </button>
        )}
      </section>
    </>
  );
};
