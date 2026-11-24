import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatCurrency } from '../../utils/formatters';
import { Lock, Shield, CheckCircle2 } from 'lucide-react';

export const RetentionsPage: React.FC = () => {
  const auctionId = 'auc_default';
  const [retentions, setRetentions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRetentions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/retentions/${auctionId}`);
      if (res.ok) setRetentions(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetentions();
  }, [auctionId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Tournament Player Retentions ({retentions.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pre-auction franchise retentions locked into team rosters with corresponding starting purse deductions.
          </p>
        </div>
      </div>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Team</th>
                <th className="px-6 py-3">Player</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Retention Slot</th>
                <th className="px-6 py-3">Deducted Price</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {retentions.map((ret) => (
                <tr key={ret.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3.5 font-bold text-blue-700">
                    {ret.team_name}
                  </td>
                  <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                      {ret.photo ? (
                        <img src={ret.photo} alt={ret.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                          {ret.full_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span>{ret.full_name}</span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">{ret.playing_role}</td>
                  <td className="px-6 py-3.5 font-semibold text-slate-800">
                    Slot #{ret.retention_order}
                  </td>
                  <td className="px-6 py-3.5 font-black text-slate-900">
                    {formatCurrency(ret.retention_price)}
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge variant="green" size="sm">
                      APPROVED
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
