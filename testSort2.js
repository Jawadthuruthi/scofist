const CLASS_ORDER = [
  "PLUS ONE",
  "PLUS ONE A",
  "PLUS ONE B",
  "PLUS TWO",
  "PLUS TWO A",
  "PLUS TWO B",
  "DEGREE FIRST YEAR",
  "DEGREE SECOND YEAR",
  "DEGREE THIRD YEAR",
  "PG FIRST YEAR",
  "PG SECOND YEAR",
  "8TH STD",
  "9TH STD",
  "10TH STD",
  "11TH STD",
  "12TH STD",
].map(name => name.replace(/\s/g, "").toUpperCase());

const sortClasses = (a, b, getName = (item) => item.name) => {
  const nameA = String(getName(a) || "").trim().toUpperCase().replace(/\s/g, "");
  const nameB = String(getName(b) || "").trim().toUpperCase().replace(/\s/g, "");

  let indexA = CLASS_ORDER.indexOf(nameA);
  let indexB = CLASS_ORDER.indexOf(nameB);

  let matchA = indexA !== -1 ? CLASS_ORDER[indexA] : null;
  let matchB = indexB !== -1 ? CLASS_ORDER[indexB] : null;

  if (indexA === -1) {
    indexA = CLASS_ORDER.findIndex(cls => nameA.includes(cls));
    if (indexA !== -1) matchA = CLASS_ORDER[indexA];
  }
  if (indexB === -1) {
    indexB = CLASS_ORDER.findIndex(cls => nameB.includes(cls));
    if (indexB !== -1) matchB = CLASS_ORDER[indexB];
  }

  if (indexA !== -1 && indexB !== -1) {
    const remainingA = nameA.replace(matchA, "");
    const remainingB = nameB.replace(matchB, "");

    if (remainingA !== remainingB) {
      return remainingA.localeCompare(remainingB);
    }
    
    return indexA - indexB;
  }
  
  if (indexA !== -1) return -1;
  if (indexB !== -1) return 1;
  return nameA.localeCompare(nameB);
};

const classes = [
    {name: "BA DEGREE FIRST YEAR"},
    {name: "BSC DEGREE SECOND YEAR"},
    {name: "BCOM DEGREE THIRD YEAR"},
    {name: "BA DEGREE SECOND YEAR"},
    {name: "BSC DEGREE FIRST YEAR"},
    {name: "PLUS ONE A"},
    {name: "DEGREE FIRST YEAR"},
    {name: "DEGREE SECOND YEAR"}
];

console.log(classes.sort((a,b) => sortClasses(a,b)).map(c => c.name));
