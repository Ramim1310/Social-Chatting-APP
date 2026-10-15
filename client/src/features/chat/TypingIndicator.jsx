import { motion as Motion } from "framer-motion";

const TypingIndicator = () => {
  return (
    <div className="flex items-center space-x-1 p-2 bg-gray-100/50 rounded-lg w-fit">
      <Motion.div
        className="w-2 h-2 bg-gray-500 rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <Motion.div
        className="w-2 h-2 bg-gray-500 rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
      <Motion.div
        className="w-2 h-2 bg-gray-500 rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      />
      <span className="text-xs text-gray-500 ml-2">Someone is typing...</span>
    </div>
  );
};

export default TypingIndicator;
