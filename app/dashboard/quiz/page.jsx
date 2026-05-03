import Header from "@/components/Header";

export default function QuizPage() {
  return (
    <>
      <Header title="QUIZ" subTitle="Manage and Participate in Quizzes" />
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-8 text-center border-2 border-dashed border-gray-200">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Coming Soon</h2>
          <p className="text-gray-500">The Quiz module is currently under development.</p>
        </div>
      </div>
    </>
  );
}
