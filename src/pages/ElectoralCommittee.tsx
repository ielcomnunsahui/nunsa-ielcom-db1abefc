import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/footerr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale } from "lucide-react";

import chairmanImage from "@/assets/chairman.png";
import deputyChairmanImage from "@/assets/deputychairman.jpg";
import secretaryImage from "@/assets/secretary.jpg";
import girkaImage from "@/assets/girka.jpg";
import simbiatImage from "@/assets/simbiat.jpg";
import jubrilImage from "@/assets/jubril.jpg";

interface Member {
  role: string;
  name: string;
  level: string;
  image: string | null;
}

const committee2627: Member[] = [
  { role: "Chairman", name: "Olokor Simbiat", level: "400L", image: simbiatImage },
  { role: "Deputy Chairman", name: "Ahmad Usman Girka", level: "400L", image: girkaImage },
  { role: "Electoral Organizer", name: "Lawal Jubril", level: "300L", image: jubrilImage },
  { role: "Secretary", name: "Yisa-Apata Islamiat", level: "300L", image: secretaryImage },
  { role: "Treasurer", name: "Oyetunde Mariam", level: "200L", image: null },
  { role: "Public Relations Officer I", name: "Abdulqoyyum Najeemdeen", level: "200L", image: null },
  { role: "Public Relations Officer II", name: "Idris Abidat", level: "100L", image: null },
];

const committee2526: Member[] = [
  { role: "Chairman", name: "Awwal Abubakar Sadik", level: "500L", image: chairmanImage },
  { role: "Deputy Chairman", name: "Abdulhameed Sherifat O.", level: "500L", image: deputyChairmanImage },
  { role: "Secretary", name: "Yisa-Apata Islamiat T.", level: "300L", image: secretaryImage },
  { role: "Treasurer", name: "Musa Zulaihat Dalhatu", level: "500L", image: null },
  { role: "Electoral Organizer", name: "Ahmad Usman Girka", level: "400L", image: girkaImage },
  { role: "P.R.O I", name: "Olokor Simbiat", level: "400L", image: simbiatImage },
  { role: "P.R.O II", name: "Lawal Jubril Opeyemi", level: "300L", image: jubrilImage },
];

const MemberCard = ({ role, name, level, image }: Member) => {
  const isFemale =
    name.includes("Sherifat") ||
    name.includes("Islamiat") ||
    name.includes("Zulaihat") ||
    name.includes("Simbiat") ||
    name.includes("Mariam") ||
    name.includes("Abidat");
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <Card className="p-4 flex flex-col items-center text-center hover:shadow-xl transition-shadow duration-300">
      <div
        className={`w-24 h-24 rounded-full overflow-hidden mb-3 border-4 ${
          image ? "border-primary" : isFemale ? "border-pink-500/50" : "border-gray-500/50"
        } bg-muted flex items-center justify-center`}
      >
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-muted-foreground">{initials}</span>
        )}
      </div>
      <Badge variant="secondary" className="mb-2">
        {role}
      </Badge>
      <h3 className="font-semibold text-sm leading-tight">{name}</h3>
      <p className="text-xs text-muted-foreground mt-1">{level} · Nursing Science</p>
    </Card>
  );
};

const CommitteeSection = ({
  title,
  subtitle,
  members,
  highlight,
}: {
  title: string;
  subtitle: string;
  members: Member[];
  highlight?: boolean;
}) => (
  <section className={`py-12 px-4 ${highlight ? "bg-primary/5" : ""}`}>
    <div className="container mx-auto max-w-6xl">
      <div className="flex items-center gap-3 mb-2">
        <Scale className="w-6 h-6 text-primary" />
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">{title}</h2>
        {highlight && <Badge className="ml-2">Current</Badge>}
      </div>
      <p className="text-muted-foreground mb-8">{subtitle}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {members.map((m) => (
          <MemberCard key={`${title}-${m.name}`} {...m} />
        ))}
      </div>
    </div>
  </section>
);

const ElectoralCommittee = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20">
        <div className="container mx-auto max-w-6xl px-4 pt-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
            </Link>
          </Button>
          <h1 className="text-3xl md:text-5xl font-extrabold mt-6 mb-3">
            NUNSA Electoral Committees
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Meet the electoral committees who steward NUNSA's democratic process. Members are
            listed by session, most recent first.
          </p>
        </div>

        <CommitteeSection
          title="Electoral Committee 2026/2027"
          subtitle="Currently serving session."
          members={committee2627}
          highlight
        />

        <CommitteeSection
          title="Electoral Committee 2025/2026"
          subtitle="Immediate past session."
          members={committee2526}
        />
      </main>
      <Footer />
    </div>
  );
};

export default ElectoralCommittee;