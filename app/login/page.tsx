import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { Photo } from "@/components/Photo";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Log in", robots: { index: false, follow: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getUser()) redirect("/");
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <div className="relative hidden md:block"><Photo k="coat-hat-editorial" pos="50% 30%" sizes="50vw" priority /></div>
      <div className="flex items-center justify-center px-5 pb-10 pt-28"><LoginForm next={next} /></div>
    </div>
  );
}
