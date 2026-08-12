import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";

const LAST_UPDATED = "August 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="mb-space-xl">
            <h2 className="mb-space-sm text-headline-md font-headline-md text-on-surface">{title}</h2>
            <div className="flex flex-col gap-space-sm text-body-md font-body-md text-on-surface-variant">
                {children}
            </div>
        </section>
    );
}

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-outline-variant bg-surface px-container-margin py-space-md">
                <Link to="/" className="flex items-center gap-2 text-primary">
                    <Icon name="school" filled className="text-2xl" />
                    <span className="text-headline-md font-headline-md font-bold">StudyPair</span>
                </Link>
            </header>

            <main className="mx-auto max-w-3xl px-container-margin py-space-xl">
                <h1 className="mb-space-xs text-headline-xl font-headline-xl text-on-surface">Privacy Policy</h1>
                <p className="mb-space-xl text-body-sm font-body-sm text-on-surface-variant">
                    Last updated: {LAST_UPDATED}
                </p>

                <p className="mb-space-xl text-body-md font-body-md text-on-surface-variant">
                    StudyPair is a free peer-tutoring platform for students to find and book study sessions
                    with each other. This page explains what information we collect, why, and what control
                    you have over it.
                </p>

                <Section title="What we collect">
                    <p>When you create an account, we collect:</p>
                    <ul className="list-disc space-y-1 pl-space-lg">
                        <li>Your name and email address</li>
                        <li>A password (if you sign up with email) — we store a one-way hash of it, never the password itself</li>
                        <li>Your Google account ID, if you sign in with Google — we don't receive your Google password</li>
                    </ul>
                    <p>When you complete your profile, we additionally collect:</p>
                    <ul className="list-disc space-y-1 pl-space-lg">
                        <li>Phone number</li>
                        <li>University/student ID</li>
                        <li>Academic level</li>
                        <li>A profile photo, if you choose to upload one</li>
                    </ul>
                    <p>
                        Phone number and student ID are encrypted at rest — even someone with direct database
                        access can't read them without the application's encryption key.
                    </p>
                    <p>
                        As you use StudyPair, we also store the activity you generate: courses you teach or
                        request, your weekly availability, session requests and their status, course
                        applications, and in-app notifications.
                    </p>
                </Section>

                <Section title="What we don't collect">
                    <p>
                        StudyPair is free — we don't collect payment information of any kind. We also don't run
                        third-party analytics or advertising trackers.
                    </p>
                </Section>

                <Section title="How we use it">
                    <ul className="list-disc space-y-1 pl-space-lg">
                        <li>To match you with tutors or students at your academic level</li>
                        <li>To let tutors and students coordinate sessions (name, course, and schedule are shown to the other party in a match)</li>
                        <li>To notify you about requests, matches, and course availability</li>
                        <li>To keep the platform functioning securely (e.g., detecting repeated failed sign-in attempts)</li>
                    </ul>
                </Section>

                <Section title="Who can see your information">
                    <p>
                        Other students can see a tutor's name, the courses they teach, and their open
                        availability. A tutor can see a requesting student's name, academic level, and the
                        course/time they've requested. We don't publish your phone number, student ID, or email
                        to other users.
                    </p>
                    <p>
                        Platform administrators can see the user directory (name, email, academic level) and
                        aggregate demand for unfulfilled course requests, in order to operate and improve the
                        platform.
                    </p>
                    <p>We do not sell your information to third parties.</p>
                </Section>

                <Section title="How long we keep it">
                    <p>
                        We keep your information for as long as your account exists. If you delete your account
                        from the Edit Profile page, your profile and everything tied to it — courses,
                        availability, requests, and applications — is permanently deleted. This cannot be
                        undone.
                    </p>
                </Section>

                <Section title="Your choices">
                    <ul className="list-disc space-y-1 pl-space-lg">
                        <li>You can edit your profile details at any time from the Edit Profile page.</li>
                        <li>You can delete your account and all associated data at any time.</li>
                        <li>Profile photo upload is optional.</li>
                    </ul>
                </Section>

                <Section title="Contact">
                    <p>
                        Questions about this policy or your data can be directed to your university's
                        StudyPair administrator.
                    </p>
                </Section>

                <p className="mt-space-xl text-body-sm font-body-sm text-outline">
                    This policy describes StudyPair's current data practices and may be updated as the
                    platform changes. It is provided as a plain-language reference, not legal advice.
                </p>
            </main>
        </div>
    );
}
