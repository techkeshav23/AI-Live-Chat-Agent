import { Sparkles, Clock, BarChart3 } from 'lucide-react';

function LandingPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-b border-gray-200 z-40">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="APEX" className="w-10 h-10 object-contain" />
                        <span className="text-2xl font-bold text-gray-900">APEX</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
                        <a href="#solutions" className="text-gray-600 hover:text-gray-900 transition-colors">Solutions</a>
                        <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
                        <button className="bg-black text-white px-6 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-all">
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Demo Section */}
            <div className="bg-gray-50 py-24">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-5xl font-bold text-gray-900 mb-6">
                                Try Our AI Agent<br />Right Now
                            </h2>
                            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                                Experience the power of AI-driven customer support. Click the chat icon in the bottom-right corner to start a conversation.
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                        <Clock size={16} className="text-gray-900" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-1">Instant Responses</h4>
                                        <p className="text-gray-600">Get answers in under 2 seconds, powered by Google Gemini AI</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1 p-1.5">
                                        <img src="/logo.png" alt="APEX" className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-1">Contextual Understanding</h4>
                                        <p className="text-gray-600">Ask about shipping, returns, or support hours—it knows everything</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                        <BarChart3 size={16} className="text-gray-900" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-1">Conversation Memory</h4>
                                        <p className="text-gray-600">It remembers your chat history across sessions</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-black rounded-3xl blur-3xl opacity-10"></div>
                            <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
                                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center p-2">
                                        <img src="/logo.png" alt="APEX" className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">AI Support Agent</h4>
                                        <p className="text-sm text-green-600 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                            Online
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-end">
                                        <div className="bg-black text-white px-4 py-3 rounded-2xl rounded-tr-none max-w-[80%]">
                                            <p className="text-sm">Do you ship to USA?</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-start">
                                        <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-none max-w-[80%]">
                                            <p className="text-sm text-gray-800">Yes, we do ship to the USA! Our standard shipping typically takes 3-5 business days. <br /> <br />

                                                Is there anything else I can help you with today?📦</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="bg-black text-white px-4 py-3 rounded-2xl rounded-tr-none max-w-[80%]">
                                            <p className="text-sm">What's your return policy?</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-start">
                                        <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-none max-w-[80%]">
                                            <p className="text-sm text-gray-800">We offer a 30-day return window for all products. Easy process, no questions asked! ✨</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                        </div>
                                        <span>AI is typing...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300 py-16">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center p-2">
                                    <img src="/logo.png" alt="APEX" className="w-full h-full object-contain" />
                                </div>
                                <span className="text-2xl font-bold text-white">APEX</span>
                            </div>
                            <p className="text-gray-400 mb-4 max-w-md">
                                AI-powered customer engagement platform trusted by 10,000+ businesses worldwide.
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                                <Sparkles size={16} className="text-gray-400" />
                                <span className="text-gray-400">Powered by Google Gemini AI</span>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4">Product</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="#solutions" className="hover:text-white transition-colors">Solutions</a></li>
                                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4">Company</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
                        <p>© 2025 APEX - AI Customer Engagement Platform. All rights reserved.</p>
                        <p className="mt-2">Built with React, TypeScript, and Gemini AI • Technical Assignment Submission</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default LandingPage;
