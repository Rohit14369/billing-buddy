import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAttendanceRecords, saveAttendanceRecord } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, Calendar } from "lucide-react";

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState(getAttendanceRecords());

  const todayStr = new Date().toLocaleDateString("en-CA");
  const todayRecord = records.find(
    (r: any) => r.userId === user?._id && r.date === todayStr
  );

  const handleCheckIn = () => {
    const record = {
      userId: user?._id,
      userName: user?.name,
      date: todayStr,
      checkIn: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      checkOut: null,
    };
    saveAttendanceRecord(record);
    setRecords(getAttendanceRecords());
    toast({ title: "Checked In!", description: `Welcome ${user?.name}` });
  };

  const handleCheckOut = () => {
    const allRecords = getAttendanceRecords();
    const idx = allRecords.findIndex(
      (r: any) => r.userId === user?._id && r.date === todayStr && !r.checkOut
    );
    if (idx >= 0) {
      allRecords[idx].checkOut = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      localStorage.setItem("st_attendance", JSON.stringify(allRecords));
      setRecords(allRecords);
      toast({ title: "Checked Out!", description: "See you tomorrow!" });
    }
  };

  const myRecords = records.filter((r: any) => r.userId === user?._id);

  return (
    <div className="space-y-6">
      <h1 className="page-header text-xl sm:text-2xl md:text-3xl">Attendance</h1>

      {/* Today's Status */}
      <div className="glass-card p-6 text-center animate-slide-up">
        <Calendar size={40} className="mx-auto mb-3 text-primary" />
        <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Hello, {user?.name}</p>

        {!todayRecord ? (
          <Button onClick={handleCheckIn} className="gradient-primary text-primary-foreground hover-glow gap-2 text-lg px-8 py-3">
            <Clock size={20} /> Check In
          </Button>
        ) : todayRecord.checkOut ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-success">
              <CheckCircle size={20} />
              <span className="font-semibold">Attendance Marked</span>
            </div>
            <p className="text-sm text-muted-foreground">
              In: {todayRecord.checkIn} — Out: {todayRecord.checkOut}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Checked in at: <strong>{todayRecord.checkIn}</strong></p>
            <Button onClick={handleCheckOut} variant="outline" className="gap-2">
              <Clock size={16} /> Check Out
            </Button>
          </div>
        )}
      </div>

      {/* History */}
      {myRecords.length > 0 && (
        <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="p-3 border-b border-border">
            <h3 className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>Recent History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-center">Check In</th>
                  <th className="px-4 py-2 text-center">Check Out</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {myRecords.slice(0, 30).map((r: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 table-row-hover">
                    <td className="px-4 py-2">{r.date}</td>
                    <td className="px-4 py-2 text-center">{r.checkIn || "-"}</td>
                    <td className="px-4 py-2 text-center">{r.checkOut || "-"}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.checkOut ? 'badge-success' : 'badge-warning'}`}>
                        {r.checkOut ? "Complete" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
