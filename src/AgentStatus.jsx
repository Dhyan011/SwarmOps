// import { useEffect, useState } from "react";

// function AgentStatus() {
//   const [agents, setAgents] = useState([
//     { name: "Detection Agent", status: "Running" },
//     { name: "Root Cause Agent", status: "Waiting" },
//     { name: "Security Agent", status: "Waiting" },
//     { name: "Evidence Agent", status: "Waiting" },
//     { name: "Fix Agent", status: "Waiting" },
//     { name: "Validation Agent", status: "Waiting" },
//   ]);

//   useEffect(() => {
//     let current = 0;

//     const interval = setInterval(() => {
//       setAgents((prev) => {
//         const updated = [...prev];

//         if (current < updated.length) {
//           if (current > 0) {
//             updated[current - 1].status = "Completed";
//           }

//           updated[current].status = "Running";
//           current++;
//         } else {
//           updated[updated.length - 1].status = "Completed";
//           clearInterval(interval);
//         }

//         return [...updated];
//       });
//     }, 3000);

//     return () => clearInterval(interval);
//   }, []);

//   const getStatusStyle = (status) => {
//     switch (status) {
//       case "Running":
//         return {
//           color: "bg-green-500",
//           text: "text-green-400",
//           label: "🟢 Running",
//         };

//       case "Completed":
//         return {
//           color: "bg-blue-500",
//           text: "text-blue-400",
//           label: "🔵 Completed",
//         };

//       case "Failed":
//         return {
//           color: "bg-red-500",
//           text: "text-red-400",
//           label: "🔴 Failed",
//         };

//       default:
//         return {
//           color: "bg-yellow-500",
//           text: "text-yellow-400",
//           label: "🟡 Waiting",
//         };
//     }
//   };

//   return (
//     <div className="bg-slate-900 rounded-xl p-6">
//       <h2 className="text-2xl font-bold mb-6">
//         Agent Status Dashboard
//       </h2>

//       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
//         {agents.map((agent) => {
//           const style = getStatusStyle(agent.status);

//           return (
//             <div
//               key={agent.name}
//               className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-cyan-500 transition-all duration-300"
//             >
//               <h3 className="font-semibold text-lg mb-4">
//                 {agent.name}
//               </h3>

//               <div className="flex items-center gap-3">
//                 <div
//                   className={`w-3 h-3 rounded-full ${
//                     style.color
//                   } ${
//                     agent.status === "Running"
//                       ? "animate-pulse"
//                       : ""
//                   }`}
//                 />

//                 <span
//                   className={`font-medium ${style.text}`}
//                 >
//                   {style.label}
//                 </span>
//               </div>

//               {agent.status === "Running" && (
//                 <div className="mt-4">
//                   <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
//                     <div className="bg-green-500 h-2 w-full animate-pulse" />
//                   </div>
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// export default AgentStatus;


import { useState, useEffect } from "react";

function AgentStatus() {
  const [agents, setAgents] = useState([
    { name: "Detection Agent", status: "running" },
    { name: "Root Cause Agent", status: "waiting" },
    { name: "Security Agent", status: "waiting" },
    { name: "Evidence Agent", status: "waiting" },
    { name: "Fix Agent", status: "waiting" },
    { name: "Validation Agent", status: "waiting" }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setAgents((prev) => {
        const updated = [...prev];

        const runningIndex = updated.findIndex(
          (a) => a.status === "running"
        );

        if (
          runningIndex !== -1 &&
          runningIndex < updated.length - 1
        ) {
          updated[runningIndex].status = "completed";
          updated[runningIndex + 1].status = "running";
        }

        return updated;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const getColor = (status) => {
    switch (status) {
      case "running":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "waiting":
        return "bg-yellow-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl p-5">
      <h2 className="text-xl font-bold mb-4">
        Agent Status
      </h2>

      <div className="grid md:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className="bg-slate-800 rounded-lg p-4"
          >
            <h3>{agent.name}</h3>

            <div className="flex items-center mt-3">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${getColor(
                  agent.status
                )}`}
              />

              <span className="capitalize">
                {agent.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AgentStatus;