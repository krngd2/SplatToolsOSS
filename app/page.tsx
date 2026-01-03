import Hero from "@/components/Hero";
import ToolsGrid from "@/components/ToolsGrid";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <div id="tools">
          <ToolsGrid />
        </div>
      </main>
      <Footer />
    </>
  );
}
