import ScratchCards from "@/components/ScratchCards";
import Header from "@/components/Header";

export default function ScratchPage() {
  return (
    <>
      <Header
        title="Scratch Cards"
        subTitle="Generate and scratch cards to reveal hidden letters"
      />
      <ScratchCards />
    </>
  );
}
