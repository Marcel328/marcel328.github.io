import Link from "next/link";
import { Header, PostMeta } from "./components";
import { getPosts } from "../lib/posts";

export default async function Home() {
  const posts = await getPosts();
  return <><Header /><main className="home-page"><section className="post-list">{posts.map((post) => <article className="post-card" key={post.slug}><Link className="post-link" href={`/posts/${post.slug}`}><h2>{post.title}</h2><PostMeta post={post} /><p>{post.excerpt}</p></Link></article>)}</section></main></>;
}
