import type { Metadata } from "next";

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
      <iframe
        className="resume-editor-document"
        src="/resume.pdf"
        title="Xinge Xu resume PDF viewer"
      />
    </div>
  );
}
