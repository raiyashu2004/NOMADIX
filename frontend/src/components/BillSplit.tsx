import { useState, useEffect } from "react"
import { useExpenseStore } from "../store/expense"
import { usePartyStore } from "../store/party"
import { useAuthStore } from "../store/auth"

export default function BillSplit() {
  const { currentGroup } = usePartyStore()
  const { user } = useAuthStore()
  const { bills, settlements, loading, error, loadBills, loadSettlements, addBill, deleteBill, clearError } = useExpenseStore()

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  
  useEffect(() => {
    if (currentGroup) {
      loadBills(currentGroup._id)
      loadSettlements(currentGroup._id)
    }
  }, [currentGroup?._id])

  if (!currentGroup) {
    return <div className="text-sm text-muted">Join a group to manage expenses.</div>
  }

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount || !user) return
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) return

    const splitAmong = currentGroup.members.map(m => m._id)

    try {
      await addBill(currentGroup._id, description, numAmount, user.id, splitAmong)
      setDescription("")
      setAmount("")
    } catch (e) {
      // error is handled in store
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-6">
        <div>
          <h3 className="mb-4 text-sm font-semibold text-text">Add New Expense</h3>
          {error && (
            <div className="px-3 py-2 mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex justify-between">
              <span>{error}</span>
              <button onClick={clearError} className="text-red-400 hover:text-red-600">✕</button>
            </div>
          )}
          <form className="space-y-3" onSubmit={handleAddBill}>
            <input
              type="text"
              placeholder="What was this for? (e.g. Dinner)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 transition border border-border rounded-xl bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="number"
              placeholder="Total Amount ($)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 transition border border-border rounded-xl bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={loading || !description || !amount}
              className="w-full py-3 font-medium text-white transition bg-primary rounded-xl hover:bg-primary-hover disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Expense"}
            </button>
            <p className="text-xs text-muted text-center mt-2">
              Expense will be split equally among all {currentGroup.members.length} members.
            </p>
          </form>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-text">Settlements (Who owes who)</h3>
          {settlements.length === 0 ? (
            <div className="p-4 text-sm text-center border rounded-xl border-border bg-background text-muted">
              All settled up!
            </div>
          ) : (
            <div className="space-y-2">
              {settlements.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-xl border-border bg-background">
                  <div className="text-sm">
                    <span className="font-semibold text-text">{s.from.name}</span> owes <span className="font-semibold text-text">{s.to.name}</span>
                  </div>
                  <div className="font-semibold text-accent">${s.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-text">Recent Expenses</h3>
        {bills.length === 0 ? (
          <div className="p-8 text-sm text-center border rounded-xl border-border bg-background text-muted">
            No expenses yet.
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {bills.map((bill) => (
              <div key={bill._id} className="p-4 border shadow-sm rounded-xl border-border bg-background">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-text">{bill.description}</span>
                  <span className="font-bold text-primary">${bill.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Paid by {bill.paidBy?.name || "Unknown"}</span>
                  <button 
                    onClick={() => deleteBill(bill._id).then(() => { loadBills(currentGroup._id); loadSettlements(currentGroup._id); })}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}