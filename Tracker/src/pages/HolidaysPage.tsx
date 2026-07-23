import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "../components/Icons";
import { useAttendance } from "../context/AttendanceContext";
import { type PublicHoliday, type Region, REGION_LABELS } from "../types";
import { formatDisplayShort } from "../utils/dateUtils";
import HolidayModal from "../components/HolidayModal";

export default function HolidaysPage() {
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Public Holidays</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Pre-loaded from company calendar screenshot. Edit or add holidays
            for your location.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700
                     text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
        >
          <Plus size={16} /> Add Holiday
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600">Year:</span>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600">Region:</span>
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value as Region | "all")}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-400"
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

        <span className="text-sm text-gray-400 ml-auto">
          {filtered.length} holidays
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🏖</p>
            <p className="font-semibold text-gray-500">
              No holidays for selected filters
            </p>
            <button
              onClick={openAdd}
              className="mt-2 text-sm text-indigo-600 hover:underline"
            >
              + Add one
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-130">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Date", "Holiday", "Regions", "Source", ""].map((h) => (
                    <th
                      key={h}
                      className={`text-left text-xs font-semibold text-gray-500 uppercase
                                           tracking-wide px-4 py-3 ${h === "Regions" ? "hidden md:table-cell" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((h) => (
                  <tr
                    key={h.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">
                      {formatDisplayShort(h.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {h.name}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {h.regions.length === 5 ? (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            All
                          </span>
                        ) : (
                          h.regions.map((r) => (
                            <span
                              key={r}
                              className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full capitalize"
                            >
                              {r.replace("_", " ")}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          h.isCustom
                            ? "bg-amber-50 text-amber-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {h.isCustom ? "✏ Custom" : "⊙ Default"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(h)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
}
