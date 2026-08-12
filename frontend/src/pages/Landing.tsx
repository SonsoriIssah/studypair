import { Link } from "react-router-dom";
import Icon from "../components/Icon";

export default function Landing() {
    return (
        <div className="flex min-h-screen flex-col bg-background text-on-background font-body-md">
            {/* TopNavBar */}
            <nav className="sticky top-0 z-50 bg-surface shadow-sm">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-container-margin py-space-md">
                    <div className="flex items-center gap-space-lg">
                        <Link to="/" className="flex items-center gap-2 text-headline-lg font-headline-lg text-primary tracking-tight">
                            <Icon name="school" filled className="text-2xl" />
                            StudyPair
                        </Link>
                        <div className="ml-space-lg hidden gap-space-md md:flex">
                            <a
                                href="#how-it-works"
                                className="border-b-2 border-primary pb-1 text-label-md font-label-md font-bold text-primary transition-colors duration-200 hover:text-primary"
                            >
                                How it Works
                            </a>
                            <Link
                                to="/login"
                                className="text-label-md font-label-md font-medium text-on-surface-variant transition-colors duration-200 hover:text-primary"
                            >
                                Find Tutors
                            </Link>
                            <a
                                href="#why-studypair"
                                className="text-label-md font-label-md font-medium text-on-surface-variant transition-colors duration-200 hover:text-primary"
                            >
                                Courses
                            </a>
                            <a
                                href="#footer"
                                className="text-label-md font-label-md font-medium text-on-surface-variant transition-colors duration-200 hover:text-primary"
                            >
                                Community
                            </a>
                        </div>
                    </div>
                    <Link
                        to="/login"
                        className="inline-block rounded-lg bg-primary-container px-space-md py-space-sm text-label-md font-label-md text-on-primary shadow-sm transition-colors duration-200 hover:bg-primary"
                    >
                        Sign In
                    </Link>
                </div>
            </nav>

            <main className="flex-grow">
                {/* Hero */}
                <section className="relative overflow-hidden pt-24 pb-32">
                    <div className="bg-pattern-dots absolute inset-0 -z-10 bg-primary-fixed opacity-30" />
                    <div className="absolute top-0 left-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-primary-fixed opacity-20 blur-3xl" />
                    <div className="mx-auto max-w-7xl px-container-margin text-center">
                        <span className="mb-space-lg inline-block rounded-full bg-secondary-container px-3 py-1 text-label-sm font-label-sm text-on-secondary-container">
                            <Icon name="school" filled className="mr-1 align-middle text-[14px]" />
                            University-Specific Peer Network
                        </span>
                        <h1 className="mx-auto mb-space-lg max-w-4xl text-headline-xl font-headline-xl leading-tight text-on-background md:text-5xl lg:text-6xl">
                            Peer tutoring, built for your campus
                        </h1>
                        <p className="mx-auto mb-space-xl max-w-2xl text-body-lg font-body-lg text-on-surface-variant">
                            Connect with fellow students to excel in your courses. Completely free, university-specific, and powered by peer support.
                        </p>
                        <div className="flex flex-col justify-center gap-space-md sm:flex-row">
                            <Link
                                to="/login"
                                state={{ mode: "signup" }}
                                className="flex items-center justify-center gap-2 rounded-lg bg-primary-container px-8 py-4 text-label-md font-label-md text-on-primary shadow-md transition-colors duration-200 hover:bg-primary hover:shadow-lg"
                            >
                                Join StudyPair
                                <Icon name="arrow_forward" />
                            </Link>
                            <a
                                href="#how-it-works"
                                className="flex items-center justify-center gap-2 rounded-lg border border-primary bg-surface px-8 py-4 text-label-md font-label-md text-primary transition-colors duration-200 hover:border-primary-container hover:bg-primary-fixed"
                            >
                                Explore Courses
                            </a>
                        </div>
                    </div>

                    {/* Decorative floating card */}
                    <div
                        className="glass-card absolute top-[40%] left-[10%] hidden w-64 -rotate-6 animate-pulse rounded-xl p-4 lg:block"
                        style={{ animationDuration: "4s" }}
                    >
                        <div className="mb-2 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-on-primary">
                                JS
                            </div>
                            <div>
                                <p className="text-label-md font-label-md">Intro to Comp Sci</p>
                                <p className="text-label-sm font-label-sm text-on-surface-variant">CS101 • Tomorrow, 2PM</p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                            <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Accepted</span>
                            <Icon name="group" className="text-primary-container" />
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section id="how-it-works" className="border-y border-outline-variant/30 bg-surface-container-lowest py-24">
                    <div className="mx-auto max-w-7xl px-container-margin">
                        <div className="mb-16 text-center">
                            <h2 className="mb-space-sm text-headline-lg font-headline-lg text-on-background">How it works</h2>
                            <p className="mx-auto max-w-2xl text-body-md font-body-md text-on-surface-variant">
                                Three simple steps to start collaborating with your peers.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-space-lg md:grid-cols-3">
                            <div className="group relative overflow-hidden rounded-xl border border-outline-variant/40 bg-surface p-space-lg shadow-sm transition-colors duration-300 hover:border-primary-container">
                                <div className="absolute top-0 left-0 h-full w-1 bg-primary-container" />
                                <div className="mb-space-lg flex h-12 w-12 items-center justify-center rounded-lg bg-primary-fixed text-primary-container">
                                    <Icon name="mail" filled className="text-3xl" />
                                </div>
                                <h3 className="mb-space-sm text-headline-md font-headline-md">Sign up with your university email</h3>
                                <p className="text-body-md font-body-md text-on-surface-variant">
                                    No third-party logins — just your university email and a password. We'll send a quick code to confirm it's really you.
                                </p>
                            </div>
                            <div className="group relative overflow-hidden rounded-xl border border-outline-variant/40 bg-surface p-space-lg shadow-sm transition-colors duration-300 hover:border-secondary-container">
                                <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-secondary-fixed-dim opacity-10" />
                                <div className="mb-space-lg flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-fixed text-secondary">
                                    <Icon name="handshake" filled className="text-3xl" />
                                </div>
                                <h3 className="mb-space-sm text-headline-md font-headline-md">Find or Become a Tutor</h3>
                                <p className="text-body-md font-body-md text-on-surface-variant">
                                    Request help in tough courses or share your expertise in subjects you've mastered. The network works both ways.
                                </p>
                            </div>
                            <div className="group relative overflow-hidden rounded-xl border border-outline-variant/40 bg-surface p-space-lg shadow-sm transition-colors duration-300 hover:border-tertiary">
                                <div className="absolute right-0 bottom-0 h-1 w-full bg-tertiary-fixed-dim" />
                                <div className="mb-space-lg flex h-12 w-12 items-center justify-center rounded-lg bg-tertiary-fixed text-tertiary">
                                    <Icon name="calendar_month" filled className="text-3xl" />
                                </div>
                                <h3 className="mb-space-sm text-headline-md font-headline-md">Book Your Way</h3>
                                <p className="text-body-md font-body-md text-on-surface-variant">
                                    Schedule flexible one-on-one or small group sessions that fit your life. Choose virtual or campus library meetups.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Why StudyPair (bento grid) */}
                <section id="why-studypair" className="bg-background py-24">
                    <div className="mx-auto max-w-7xl px-container-margin">
                        <div className="mb-16">
                            <h2 className="mb-space-sm text-headline-lg font-headline-lg text-on-background">Why StudyPair</h2>
                            <p className="text-body-md font-body-md text-on-surface-variant">
                                Designed specifically for the modern university experience.
                            </p>
                        </div>
                        <div className="grid auto-rows-[minmax(200px,auto)] grid-cols-1 gap-space-lg md:grid-cols-12">
                            <div className="relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-2xl bg-primary-container p-space-xl text-on-primary md:col-span-8">
                                <div className="absolute top-0 right-0 h-64 w-64 -translate-y-1/2 translate-x-1/4 rounded-full bg-white opacity-5 blur-2xl" />
                                <Icon name="money_off" className="mb-space-md text-5xl opacity-80" />
                                <h3 className="mb-space-xs text-headline-lg-mobile font-headline-lg-mobile">Always Free</h3>
                                <p className="max-w-lg text-body-md font-body-md opacity-90">
                                    Peer-to-peer means no payments, just mutual support. Education should be accessible, and help shouldn't come with a price tag.
                                </p>
                            </div>
                            <div className="flex flex-col rounded-2xl border border-outline-variant/50 bg-surface p-space-lg shadow-sm md:col-span-4">
                                <div className="mb-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
                                    <Icon name="tune" className="text-on-surface-variant" />
                                </div>
                                <div className="mt-space-lg">
                                    <h3 className="mb-space-xs text-headline-md font-headline-md text-on-background">Tailored to You</h3>
                                    <p className="text-body-sm font-body-sm text-on-surface-variant">
                                        Search by course levels (100-400) to find exactly the right match for your specific syllabus.
                                    </p>
                                </div>
                            </div>
                            <div className="relative flex flex-col overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface p-space-lg shadow-sm md:col-span-5">
                                <Icon name="psychology" className="absolute -right-4 -bottom-4 text-[120px] opacity-5" />
                                <div className="mb-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
                                    <Icon name="forum" className="text-on-surface-variant" />
                                </div>
                                <div className="relative z-10 mt-space-lg">
                                    <h3 className="mb-space-xs text-headline-md font-headline-md text-on-background">Relatable Support</h3>
                                    <p className="text-body-sm font-body-sm text-on-surface-variant">
                                        Learn from students who just took the same course you're in. They know the professor's quirks and the toughest concepts.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-low p-space-lg md:col-span-7">
                                <div className="w-1/2 pr-space-lg">
                                    <Icon name="groups" filled className="mb-space-sm text-3xl text-secondary" />
                                    <h3 className="mb-space-xs text-headline-md font-headline-md text-on-background">Flexible Sessions</h3>
                                    <p className="text-body-sm font-body-sm text-on-surface-variant">
                                        Choose between focused solo help or collaborative group study based on your learning style.
                                    </p>
                                </div>
                                <div className="relative h-full min-h-[160px] w-1/2 rounded-xl border border-outline-variant/30 bg-surface p-4 shadow-inner flex flex-col">
                                    <div className="mb-3 flex gap-2">
                                        <div className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-on-primary-fixed-variant">
                                            1-on-1
                                        </div>
                                        <div className="rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant">
                                            Group (3-5)
                                        </div>
                                    </div>
                                    <div className="mt-auto space-y-2">
                                        <div className="h-8 w-full rounded-md bg-surface-container opacity-60" />
                                        <div className="h-8 w-4/5 rounded-md bg-surface-container opacity-40" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer id="footer" className="mt-auto border-t border-outline-variant bg-surface-container">
                <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-gutter px-container-margin py-space-xl md:flex-row">
                    <div className="mb-4 md:mb-0">
                        <span className="text-headline-md font-headline-md text-primary">StudyPair</span>
                    </div>
                    <div className="mb-4 flex flex-wrap justify-center gap-space-lg md:mb-0">
                        <a href="#" className="text-label-sm font-label-sm text-on-surface-variant transition-all duration-200 hover:text-primary hover:underline">
                            About Us
                        </a>
                        <a href="#" className="text-label-sm font-label-sm text-on-surface-variant transition-all duration-200 hover:text-primary hover:underline">
                            Student Guidelines
                        </a>
                        <Link to="/privacy" className="text-label-sm font-label-sm text-on-surface-variant transition-all duration-200 hover:text-primary hover:underline">
                            Privacy Policy
                        </Link>
                        <a href="#" className="text-label-sm font-label-sm text-on-surface-variant transition-all duration-200 hover:text-primary hover:underline">
                            Contact Support
                        </a>
                    </div>
                    <div className="text-center md:text-right">
                        <p className="text-body-sm font-body-sm text-on-surface">© 2026 StudyPair. Elevating peer-to-peer academic success.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
