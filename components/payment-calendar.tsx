import { formatMoney } from "@/lib/client-format";
import type { PaymentEvent } from "@/types/crm";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PaymentCalendar({ events }: { events: PaymentEvent[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - leading + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const dateKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const byDate = new Map<string, PaymentEvent[]>();

  events.forEach((event) => {
    byDate.set(event.due_date, [...(byDate.get(event.due_date) ?? []), event]);
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold text-neutral-950">
            {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(first)}
          </h2>
          <p className="mt-0.5 text-xs text-muted">Scheduled charges and completed payments</p>
        </div>
        <div className="hidden items-center gap-4 text-xs text-muted sm:flex">
          <Legend color="bg-blue-500" label="Scheduled" />
          <Legend color="bg-emerald-500" label="Paid" />
          <Legend color="bg-rose-500" label="Overdue" />
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-border bg-neutral-50/70">
        {weekdays.map((day) => (
          <div key={day} className="px-2 py-2 text-center text-[11px] font-semibold text-muted">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          const dayEvents = day ? byDate.get(dateKey(day)) ?? [] : [];
          const isToday =
            day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <div
              key={index}
              className={`min-h-24 border-b border-r border-border p-1.5 sm:min-h-28 sm:p-2 ${
                day ? "bg-white" : "bg-neutral-50/50"
              }`}
            >
              {day && (
                <>
                  <span
                    className={`grid size-6 place-items-center rounded-full text-xs ${
                      isToday ? "bg-neutral-900 font-semibold text-white" : "text-neutral-600"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-1.5 space-y-1">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`overflow-hidden rounded-md border-l-2 px-1.5 py-1 text-[10px] leading-tight ${
                          event.status === "paid"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                            : event.status === "overdue"
                              ? "border-rose-500 bg-rose-50 text-rose-800"
                              : "border-blue-500 bg-blue-50 text-blue-800"
                        }`}
                      >
                        <p className="truncate font-semibold">{event.company_name}</p>
                        <p className="mt-0.5 truncate">{formatMoney(event.amount_cents, event.currency)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
