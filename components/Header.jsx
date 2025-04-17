"use client";

const Header = ({ title, subTitle }) => {
  return (
    <div className="p-2 mb-4">
      <h1 className="font-bold text-xl md:text-2xl text-foreground">{title}</h1>
      <h3 className="text-muted-foreground">{subTitle}</h3>
    </div>
  );
};

export default Header;
