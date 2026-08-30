import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resume PDF Viewer",
  description: "Full PDF viewer for Xinge Xu's resume.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResumeEditorPage() {
  return (
    <div className="resume-editor-page tab-enter">
      <div className="resume-editor-stage">
        <Link
          href="/resume"
          className="resume-side-back"
          aria-label="Back to resume preview"
          title="Back to resume preview"
        >
          <span aria-hidden>←</span>
          <span>go back</span>
        </Link>
        <iframe
          className="resume-editor-document"
          src="/resume.pdf#toolbar=1&navpanes=0&scrollbar=1&view=FitH&pagemode=none"
          title="Xinge Xu resume PDF viewer"
        />
      </div>
    </div>
  );
}
