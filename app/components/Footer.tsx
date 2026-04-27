"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { 
  Facebook, Instagram, Github, Linkedin, 
  ShieldCheck, ArrowUp 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Footer() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    // relative z-10 ug bg-white ensures nga matabonan ang background lines
    <footer className="relative z-10 w-full bg-white border-t border-gray-100 pt-20 pb-10 px-6 mt-auto">
      
      {/* --- Back to Top Button --- */}
      <AnimatePresence>
        {isVisible && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-10 right-10 z-[110] p-4 bg-white border border-gray-100 text-[#f05a28] rounded-2xl shadow-xl hover:shadow-[#f05a28]/20 hover:ring-4 hover:ring-[#f05a28]/10 transition-all duration-300 group"
          >
            <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform duration-300" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          
          {/* --- Brand Section (5 cols) --- */}
          <div className="md:col-span-5 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-xl">
                <Image src="/cet.png" alt="CET Logo" width={40} height={40} className="object-contain" unoptimized priority />
              </div>
              <h2 className="font-[900] text-2xl tracking-tighter italic text-gray-900">
                CET<span className="text-[#f05a28]">VOTE</span>
              </h2>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-sm font-medium">
              The official secure online voting platform for the College of Engineering and Technology Students Organization. Empowering students through digital democracy.
            </p>
          </div>

          {/* --- Links Section (4 cols) --- */}
          <div className="md:col-span-4 grid grid-cols-2 gap-4">
            <div className="space-y-5">
              <h3 className="text-[11px] font-[900] uppercase tracking-[0.25em] text-gray-400">Support</h3>
              <ul className="space-y-3 text-sm font-bold text-gray-600">
                <li><a href="#" className="hover:text-[#f05a28] transition-colors inline-block">Help Desk</a></li>
                <li><a href="#" className="hover:text-[#f05a28] transition-colors inline-block">FAQs</a></li>
              </ul>
            </div>
            <div className="space-y-5">
              <h3 className="text-[11px] font-[900] uppercase tracking-[0.25em] text-gray-400">Legal</h3>
              <ul className="space-y-3 text-sm font-bold text-gray-600">
                <li><a href="#" className="hover:text-[#f05a28] transition-colors inline-block">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#f05a28] transition-colors inline-block">Terms of Use</a></li>
              </ul>
            </div>
          </div>

          {/* --- Social & Security (3 cols) --- */}
          <div className="md:col-span-3 space-y-8 flex flex-col md:items-end">
            <div className="flex flex-wrap gap-3">
              {[
                { icon: <Facebook size={20} />, href: "#" },
                { icon: <Instagram size={20} />, href: "#" },
                { icon: <Github size={20} />, href: "https://github.com/Ivanne359" },
                { icon: <Linkedin size={20} />, href: "#" }
              ].map((social, idx) => (
                <a 
                  key={idx}
                  href={social.href} 
                  className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-[#f05a28] hover:bg-white hover:shadow-lg hover:shadow-[#f05a28]/10 hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-gray-100"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* --- Bottom Bar --- */}
        <div className="pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col gap-1">
             <p className="text-[11px] font-bold text-gray-400 text-center md:text-left uppercase tracking-tight">
              © 2026 College of Engineering and Technology Students Organization.
            </p>
            
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dev by</span>
            <span className="text-[11px] font-black text-gray-900 uppercase tracking-wider">Group HCI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}