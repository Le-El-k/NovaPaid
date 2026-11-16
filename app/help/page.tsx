"use client";

import { useState, useEffect } from "react";
import { HelpCircle, Search, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { ServiceUnavailable } from "../components/common/ServiceUnavailable";
import { RequireAuth } from "../components/auth/RequireAuth";
import { SERVICES_LIVE } from "@/app/lib/feature-flags";

interface Article { id: number; category: string; title: string; slug: string; content: string; excerpt?: string; }

export default function HelpPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/help").then(r => r.json()).then(j => {
      if (j.success) setArticles(j.articles || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase()) ||
    (a.excerpt || "").toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filtered.map(a => a.category))];

  return (
    <RequireAuth>
      {!SERVICES_LIVE ? <ServiceUnavailable /> : (
    <div className="np-help-center">
      <div className="np-help-header">
        <HelpCircle size={28} />
        <div>
          <h1>Centre d'aide</h1>
          <p>Trouvez des réponses à vos questions</p>
        </div>
      </div>

      <div className="np-help-search">
        <Search size={16} />
        <input type="text" placeholder="Rechercher un article…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading && <div className="np-security-loading">Chargement…</div>}

      {!loading && filtered.length === 0 && (
        <div className="np-help-empty">
          <BookOpen size={40} />
          <p>{search ? "Aucun résultat." : "Aucun article disponible."}</p>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat} className="np-help-category">
          <h2>{cat.charAt(0).toUpperCase() + cat.slice(1)}</h2>
          <div className="np-help-articles">
            {filtered.filter(a => a.category === cat).map(a => (
              <div key={a.id} className={`np-help-article ${expanded === a.id ? "open" : ""}`}>
                <button className="np-help-article-header" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                  {expanded === a.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span>{a.title}</span>
                </button>
                {a.excerpt && expanded !== a.id && <p className="np-help-excerpt">{a.excerpt}</p>}
                {expanded === a.id && <div className="np-help-content">{a.content}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
      )}
    </RequireAuth>
  );
}
