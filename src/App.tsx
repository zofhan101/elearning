import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import Explorer from "./pages/Explorer";
import CourseLayout from "./pages/CourseLayout";
import CourseInfo from "./pages/CourseInfo";
import CourseModules from "./pages/CourseModules";
import CourseEvaluations from "./pages/CourseEvaluations";
import CoursePeople from "./pages/CoursePeople";
import CourseStats from "./pages/CourseStats";
import EvaluationDetail from "./pages/EvaluationDetail";
import Quiz from "./pages/Quiz";
import QuizResult from "./pages/QuizResult";
import NotFound from "./pages/NotFound";
import AdminSignupRequests from "./pages/AdminSignupRequests";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
            <Route path="/explorer" element={<RequireAuth><Explorer /></RequireAuth>} />
            <Route path="/cours/:id" element={<RequireAuth><CourseLayout /></RequireAuth>}>
              <Route index element={<CourseInfo />} />
              <Route path="renseignements" element={<CourseInfo />} />
              <Route path="modules" element={<CourseModules />} />
              <Route path="evaluations" element={<CourseEvaluations />} />
              <Route path="personnes" element={<CoursePeople />} />
              <Route path="suivi" element={<CourseStats />} />
              <Route path="autorisations" element={<CourseStats />} />
            </Route>
            <Route path="/evaluation/:id" element={<RequireAuth><EvaluationDetail /></RequireAuth>} />
            <Route path="/quiz/:attemptId" element={<RequireAuth><Quiz /></RequireAuth>} />
            <Route path="/resultat/:attemptId" element={<RequireAuth><QuizResult /></RequireAuth>} />
            <Route path="/admin/inscriptions" element={<RequireAuth><AdminSignupRequests /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
