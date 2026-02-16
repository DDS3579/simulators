import { IUPACSection } from "../components/organic-iupac/IUPACSection";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function MolecularViewer() {
    return (
        <div className="min-h-screen bg-gray-50 pt-8 pb-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="space-y-4">
                    <Link
                        to="/"
                        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Simulators
                    </Link>

                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                            Molecular Viewer & IUPAC Naming
                        </h1>
                        <p className="mt-2 text-lg text-muted-foreground max-w-3xl">
                            Visualize organic molecules, practice IUPAC nomenclature, and understand chemical structures in 2D and 3D.
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <IUPACSection />
            </div>
        </div>
    );
}
