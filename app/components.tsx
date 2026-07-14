import Link from "next/link";
import type { PostSummary } from "../lib/posts";

export function Header() {
  return <header className="site-header"><Link className="brand" href="/" aria-label="返回首页">留白<span>·</span></Link></header>;
}

// export function Footer() {
//   return <footer>留白 · 以 Markdown 写作</footer>;
// }

export function PostMeta({ post }: { post: PostSummary }) {
  return <div className="post-meta"><time dateTime={post.date}>{formatDate(post.date)}</time><span>{post.readingTime} 分钟阅读</span></div>;
}

function formatDate(date: string) {
  if (!date) return "未标注日期";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${date}T00:00:00`));
}
