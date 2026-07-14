import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, PostMeta } from "../../components";
import { getPost, getPosts } from "../../../lib/posts";

export async function generateStaticParams() {
  return (await getPosts()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return post ? { title: `${post.title} | 留白`, description: post.excerpt } : {};
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  return <><Header /><main className="article-shell"><article><header className="article-header"><PostMeta post={post} /><h1>{post.title}</h1></header><div className="article-content" dangerouslySetInnerHTML={{ __html: post.html }} /></article><nav className="article-nav" aria-label="文章导航">{post.previous ? <Link href={`/posts/${post.previous.slug}`}><span>上一篇</span>{post.previous.title}</Link> : <span />}{post.next ? <Link href={`/posts/${post.next.slug}`}><span>下一篇</span>{post.next.title}</Link> : <span />}</nav></main></>;
}
