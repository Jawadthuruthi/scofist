import EvaluationSheetsComponent from "@/components/EvaluationSheetsComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";

export default async function EvaluationSheetsPage() {
  try {
    const apiKey = process.env.API_KEY;

    return (
      <>
        <Header title="EVALUATION SHEETS" subTitle="View Evaluation Sheets" />
        <div className="pt-1">
          <EvaluationSheetsComponent apiKey={apiKey} />
        </div>
      </>
    );
  } catch (error) {
    console.error("Error loading evaluation page:", error?.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Access Error"
        description={
          error?.message ||
          "An unexpected error occurred while processing your request."
        }
      />
    );
  }
}

export const dynamic = "force-dynamic";
