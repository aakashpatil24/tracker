import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Umbrella } from "../components/Icons";
import { useAttendance } from "../context/AttendanceContext";
import { type PublicHoliday, type Region, REGION_LABELS } from "../types";
import { formatDisplayShort } from "../utils/dateUtils";
import HolidayModal from "../components/HolidayModal";

const HolidaysPage = () => {
  const { getAllHolidaysAdmin, removeHoliday } = useAttendance();
  const all = getAllHolidaysAdmin();

  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterRegion, setFilterRegion] = useState<Region | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PublicHoliday | undefined>();

  const availableYears = useMemo(() => {
    const s = new Set(all.map((h) => Number(h.date.slice(0, 4))));
    const y = new Date().getFullYear();
    [y - 1, y, y + 1].forEach((yr) => s.add(yr));
    return Array.from(s).sort((a, b) => a - b);
  }, [all]);

  const filtered = useMemo(
    () =>
      all.filter((h) => {
        const y = h.date.startsWith(String(filterYear));
        const r = filterRegion === "all" || h.regions.includes(filterRegion);
        return y && r;
      }),
    [all, filterYear, filterRegion],
  );

  const openAdd = () => {
    setEditTarget(undefined);
    setModalOpen(true);
  };
  const openEdit = (h: PublicHoliday) => {
    setEditTarget(h);
    setModalOpen(true);
  };
  const handleDelete = (id: string) => {
    if (
      window.confirm(
        "Remove this holiday? You can add it back manually if needed.",
      )
    ) {
      removeHoliday(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-zinc-100">
            Public Holidays
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5 hidden sm:block">
            Pre-loaded from company calendar. Edit or add holidays for your
            location.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-amber-400 hover:bg-amber-300
                     text-zinc-900 rounded-xl text-sm font-semibold transition-colors shrink-0"
        >
          <Plus size={16} />{" "}
          <span className="hidden sm:inline">Add Holiday</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900/70 rounded-2xl p-4 border border-zinc-800 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-400">Year</span>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-2.5 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-400">Region</span>
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value as Region | "all")}
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-2.5 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          >
            <option value="all">All Regions</option>
            {(Object.entries(REGION_LABELS) as [Region, string][]).map(
              ([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ),
            )}
          </select>
        </div>

        <span className="text-sm text-zinc-500 ml-auto">
          {filtered.length} holidays
        </span>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/70 rounded-2xl border border-zinc-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <Umbrella size={36} className="mx-auto mb-3 text-zinc-600" />
            <p className="font-medium text-zinc-400">
              No holidays for selected filters
            </p>
            <button
              onClick={openAdd}
              className="mt-2 text-sm text-amber-400 hover:text-amber-300"
            >
              + Add one
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-130">
              <thead>
                <tr className="bg-zinc-800/50 border-b border-zinc-800">
                  {["Date", "Holiday", "Regions", "Source", ""].map((h) => (
                    <th
                      key={h}
                      className={`text-left text-xs font-medium text-zinc-500 uppercase
                                           tracking-wide px-4 py-3 ${h === "Regions" ? "hidden md:table-cell" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((h) => (
                  <tr
                    key={h.id}
                    className="hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-zinc-300 whitespace-nowrap">
                      {formatDisplayShort(h.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-100 font-medium">
                      {h.name}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {h.regions.length === 5 ? (
                          <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">
                            All
                          </span>
                        ) : (
                          h.regions.map((r) => (
                            <span
                              key={r}
                              className="text-xs px-2 py-0.5 bg-amber-400/10 text-amber-300 rounded-full capitalize"
                            >
                              {r.replace("_", " ")}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          h.isCustom
                            ? "bg-amber-400/10 text-amber-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {h.isCustom ? "Custom" : "Default"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(h)}
                          className="p-1.5 text-zinc-500 hover:text-amber-300 hover:bg-amber-400/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <HolidayModal
          holiday={editTarget}
          onClose={() => {
            setModalOpen(false);
            setEditTarget(undefined);
          }}
        />
      )}
    </div>
  );
};

export default HolidaysPage;
