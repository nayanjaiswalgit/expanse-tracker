import React, { useState, useEffect } from "react";
import {
  Plus,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  HandHeart,
  User,
  Calendar,
  CheckCircle,
  Clock,
} from "lucide-react";
import { apiClient } from "../../api/client";
import { FormModal } from "../../components/ui/FormModal";
import { ProgressBar } from "../../components/common/ProgressBar";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency } from "../../utils/preferences";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import type { Contact, Account, UnifiedTransaction } from "../../types";

interface ContactBalance {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  totalLent: number;
  totalBorrowed: number;
  netBalance: number;
  lastActivity: string;
  transactionCount: number;
}

export const LendingTracker: React.FC = () => {
  const { state: authState } = useAuth();
  const { showSuccess, showError } = useToast();

  // State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);

  // Lending state
  const [lendingTransactions, setLendingTransactions] = useState<UnifiedTransaction[]>([]);
  const [contactBalances, setContactBalances] = useState<ContactBalance[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactBalance | null>(null);
  const [contactTransactions, setContactTransactions] = useState<UnifiedTransaction[]>([]);
  const [showCreateLendingModal, setShowCreateLendingModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedTransaction | null>(null);

  // Form states
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [newLendingTransaction, setNewLendingTransaction] = useState({
    contact: "",
    account: "",
    transaction_type: "lent" as "lent" | "borrowed",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [repaymentData, setRepaymentData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const failedServices: string[] = [];
    let contactsData: any[] = [];
    let accountsData: any[] = [];
    let lendingData: any[] = [];

    try {
      console.log("Loading lending data...");

      try {
        contactsData = await apiClient.getContacts();
        console.log("Contacts loaded:", contactsData.length);
      } catch (err) {
        console.error("Failed to load contacts:", err);
        failedServices.push("contacts");
      }

      try {
        accountsData = await apiClient.getAccounts();
        console.log("Accounts loaded:", accountsData.length);
      } catch (err) {
        console.error("Failed to load accounts:", err);
        failedServices.push("accounts");
      }

      try {
        lendingData = await apiClient.getLendingTransactions();
        console.log("Lending transactions loaded:", lendingData.length);
      } catch (err) {
        console.error("Failed to load lending transactions:", err);
        failedServices.push("lending transactions");
      }

      setContacts(contactsData);
      setAccounts(accountsData);
      setLendingTransactions(lendingData);

      // Process lending transactions to create contact balances
      const contactMap = new Map<number, ContactBalance>();

      contactsData.forEach((contact) => {
        contactMap.set(contact.id, {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          totalLent: 0,
          totalBorrowed: 0,
          netBalance: 0,
          lastActivity: "Never",
          transactionCount: 0,
        });
      });

      lendingData.forEach((transaction) => {
        const contactId = transaction.contact_user;
        if (!contactId) return;

        const contactBalance = contactMap.get(contactId);
        if (!contactBalance) return;

        const amount = parseFloat(transaction.amount);
        const remaining = transaction.remaining_amount || 0;

        if (transaction.transaction_type === "lend") {
          contactBalance.totalLent += amount;
          contactBalance.netBalance += remaining;
        } else if (transaction.transaction_type === "borrow") {
          contactBalance.totalBorrowed += amount;
          contactBalance.netBalance -= remaining;
        }

        contactBalance.transactionCount++;
        contactBalance.lastActivity = new Date(transaction.date).toLocaleDateString();
      });

      setContactBalances(
        Array.from(contactMap.values()).filter((cb) => cb.transactionCount > 0)
      );

      if (failedServices.length > 0) {
        const failedList = failedServices.join(", ");
        showError(
          "Partial Data Load",
          `Could not load: ${failedList}. Some features may not work properly.`
        );
      }
    } catch (error: any) {
      console.error("Unexpected error during data loading:", error);
      showError(
        "Failed to load data",
        "An unexpected error occurred. Please try refreshing the page."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadContactTransactions = async (contactId: number) => {
    try {
      const allTransactions = await apiClient.getLendingTransactions(contactId);
      setContactTransactions(allTransactions);
    } catch (error) {
      console.error("Failed to load contact transactions:", error);
      showError("Failed to load transactions", "Please try again");
    }
  };

  const handleContactSelect = async (contact: ContactBalance) => {
    setSelectedContact(contact);
    await loadContactTransactions(contact.id);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim()) {
      showError("Name Required", "Please enter a contact name");
      return;
    }

    try {
      const contact = await apiClient.createContact(newContact);
      setContacts((prev) => [...prev, contact]);
      setNewContact({ name: "", email: "", phone: "" });
      setShowCreateContactModal(false);
      showSuccess("Contact Added", `${contact.name} has been added successfully`);
    } catch (error) {
      showError("Failed to add contact", "Please try again");
    }
  };

  const handleCreateLendingTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !newLendingTransaction.contact ||
      !newLendingTransaction.account ||
      !newLendingTransaction.amount ||
      !newLendingTransaction.description.trim()
    ) {
      showError("Missing Information", "Please fill in all required fields");
      return;
    }

    try {
      await apiClient.createLendingTransaction({
        contact_user: parseInt(newLendingTransaction.contact),
        account: parseInt(newLendingTransaction.account),
        transaction_type: newLendingTransaction.transaction_type,
        amount: newLendingTransaction.amount,
        description: newLendingTransaction.description,
        date: newLendingTransaction.date,
        notes: newLendingTransaction.notes,
      });

      setNewLendingTransaction({
        contact: "",
        account: "",
        transaction_type: "lend",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setShowCreateLendingModal(false);

      await loadData();
      if (selectedContact) {
        await loadContactTransactions(selectedContact.id);
      }

      showSuccess("Transaction Added", "Lending transaction has been recorded successfully");
    } catch (error) {
      showError("Failed to create transaction", "Please try again");
    }
  };

  const handleRecordRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction || !repaymentData.amount) {
      showError("Missing Information", "Please enter repayment amount");
      return;
    }

    try {
      await apiClient.recordLendingRepayment(
        selectedTransaction.id,
        repaymentData.amount,
        repaymentData.date,
        repaymentData.notes
      );

      setRepaymentData({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setShowRepaymentModal(false);
      setSelectedTransaction(null);

      await loadData();
      if (selectedContact) {
        await loadContactTransactions(selectedContact.id);
      }

      showSuccess("Repayment Recorded", "Payment has been recorded successfully");
    } catch (error) {
      showError("Failed to record repayment", "Please try again");
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: "bg-yellow-100 text-yellow-800",
      partially_repaid: "bg-blue-100 text-blue-800",
      fully_repaid: "bg-green-100 text-green-800",
      written_off: "bg-red-100 text-red-800",
    };

    return badges[status as keyof typeof badges] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">
              💰 Personal Lending
            </h1>
            <p className="text-purple-100 text-lg">
              Track money you've lent and borrowed from friends
            </p>
            <div className="mt-4 flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <HandHeart className="w-5 h-5 mr-2" />
                <span>{contactBalances.length} lending contacts</span>
              </div>
              <div className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                <span>{contacts.length} total contacts</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                <span>{lendingTransactions.length} transactions</span>
              </div>
            </div>
          </div>
          <div className="mt-6 lg:mt-0 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowCreateContactModal(true)}
              variant="ghost-white"
              size="sm"
            >
              <User className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
            <Button
              onClick={() => setShowCreateLendingModal(true)}
              variant="primary"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Contact List - Khata Book Style */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <div className="w-3 h-3 bg-pink-500 rounded-full mr-3"></div>
                Lending Contacts
              </h2>
              <p className="theme-text-secondary text-sm mt-1">
                Click on a person to view their transactions
              </p>
            </div>
            <div className="divide-y divide-gray-200">
              {contactBalances.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <HandHeart className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-medium theme-text-primary mb-2">
                    No lending contacts yet
                  </h3>
                  <p className="theme-text-secondary mb-4">
                    Add a contact and create your first lending transaction
                  </p>
                  <Button
                    onClick={() => setShowCreateContactModal(true)}
                    variant="link"
                  >
                    Add your first contact
                  </Button>
                </div>
              ) : (
                contactBalances.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleContactSelect(contact)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedContact?.id === contact.id
                        ? "bg-pink-50 border-r-4 border-pink-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-lg ${
                            contact.netBalance > 0
                              ? "bg-green-500"
                              : contact.netBalance < 0
                              ? "bg-red-500"
                              : "bg-gray-500"
                          }`}
                        >
                          {contact.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {contact.name}
                          </h3>
                          <p className="text-sm theme-text-secondary">
                            {contact.transactionCount} transactions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-xl font-bold ${
                            contact.netBalance > 0
                              ? "text-green-600"
                              : contact.netBalance < 0
                              ? "text-red-600"
                              : "theme-text-secondary"
                          }`}
                        >
                          {contact.netBalance > 0 && "+"}
                          {formatCurrency(Math.abs(contact.netBalance), authState.user)}
                        </div>
                        <div className="text-xs theme-text-muted">
                          {contact.netBalance > 0
                            ? "Owes you"
                            : contact.netBalance < 0
                            ? "You owe"
                            : "Settled"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="lg:col-span-3">
          {selectedContact ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-50 to-red-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-3 ${
                          selectedContact.netBalance > 0
                            ? "bg-green-500"
                            : selectedContact.netBalance < 0
                            ? "bg-red-500"
                            : "bg-gray-500"
                        }`}
                      ></div>
                      {selectedContact.name}
                    </h2>
                    <p className="theme-text-secondary mt-1">
                      Transaction history and balance
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-3xl font-bold ${
                        selectedContact.netBalance > 0
                          ? "text-green-600"
                          : selectedContact.netBalance < 0
                          ? "text-red-600"
                          : "theme-text-secondary"
                      }`}
                    >
                      {selectedContact.netBalance > 0 && "+"}
                      {formatCurrency(Math.abs(selectedContact.netBalance), authState.user)}
                    </div>
                    <div className="text-sm theme-text-secondary">
                      {selectedContact.netBalance > 0
                        ? "They owe you"
                        : selectedContact.netBalance < 0
                        ? "You owe them"
                        : "All settled"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Summary */}
              <div className="p-6 bg-gray-50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedContact.totalLent, authState.user)}
                    </div>
                    <div className="text-sm theme-text-secondary">You lent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(selectedContact.totalBorrowed, authState.user)}
                    </div>
                    <div className="text-sm theme-text-secondary">You borrowed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-medium theme-text-secondary">
                      {selectedContact.transactionCount}
                    </div>
                    <div className="text-sm theme-text-secondary">Total transactions</div>
                  </div>
                </div>
              </div>

              {/* Transaction List */}
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {contactTransactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="theme-text-secondary text-lg">No transactions found</p>
                  </div>
                ) : (
                  contactTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              transaction.transaction_type === "lent"
                                ? "bg-green-100 text-green-600"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {transaction.transaction_type === "lent" ? (
                              <ArrowUpRight className="w-6 h-6" />
                            ) : (
                              <ArrowDownLeft className="w-6 h-6" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg text-gray-800">
                              {transaction.description}
                            </h4>
                            <div className="flex items-center space-x-3 text-sm theme-text-secondary">
                              <span>
                                {new Date(transaction.date).toLocaleDateString()}
                              </span>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                                  transaction.status
                                )}`}
                              >
                                {transaction.status.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-xl font-bold ${
                              transaction.transaction_type === "lent"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(parseFloat(transaction.amount), authState.user)}
                          </div>
                          <div className="text-sm theme-text-muted mt-1">
                            {transaction.remaining_amount && transaction.remaining_amount > 0 && (
                                <>
                                  <span className="text-orange-600 font-medium">
                                    {formatCurrency(
                                      transaction.remaining_amount,
                                      authState.user
                                    )}{" "}
                                    pending
                                  </span>
                                  <Button
                                    onClick={() => {
                                      setSelectedTransaction(transaction);
                                      setRepaymentData((prev) => ({
                                        ...prev,
                                        amount: transaction.remaining_amount?.toString() || "",
                                      }));
                                      setShowRepaymentModal(true);
                                    }}
                                    variant="link"
                                    size="sm"
                                  >
                                    Record Payment
                                  </Button>
                                </>
                              )}
                          </div>
                        </div>
                      </div>

                      {/* Repayment Progress */}
                      {transaction.remaining_amount && transaction.remaining_amount > 0 && transaction.repayment_percentage !== undefined && (
                          <div className="mt-3 pl-16">
                            <div className="flex justify-between text-sm theme-text-secondary mb-1">
                              <span>Repayment Progress</span>
                              <span>{transaction.repayment_percentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <ProgressBar
                                percentage={transaction.repayment_percentage}
                                className="bg-blue-600"
                              />
                            </div>
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
              <div className="bg-pink-100 p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Eye className="w-10 h-10 text-pink-600" />
              </div>
              <h3 className="text-xl font-medium theme-text-primary mb-2">
                Select a contact to view transactions
              </h3>
              <p className="theme-text-secondary text-lg">
                Choose a person from the left to see their lending history and current balance
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Contact Modal */}
      <FormModal
        isOpen={showCreateContactModal}
        onClose={() => setShowCreateContactModal(false)}
        title="Add New Contact"
      >
        <form onSubmit={handleCreateContact} className="space-y-5 p-6">
          <Input
            label="Name"
            type="text"
            value={newContact.name}
            onChange={(e) =>
              setNewContact((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Contact name"
            required
          />

          <Input
            label="Email"
            type="email"
            value={newContact.email}
            onChange={(e) =>
              setNewContact((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="contact@example.com"
          />

          <Input
            label="Phone"
            type="tel"
            value={newContact.phone}
            onChange={(e) =>
              setNewContact((prev) => ({ ...prev, phone: e.target.value }))
            }
            placeholder="+1 (555) 123-4567"
          />

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={() => setShowCreateContactModal(false)}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Contact
            </Button>
          </div>
        </form>
      </FormModal>

      {/* Create Lending Transaction Modal */}
      <FormModal
        isOpen={showCreateLendingModal}
        onClose={() => setShowCreateLendingModal(false)}
        title="Add Lending Transaction"
        size="lg"
      >
        <form onSubmit={handleCreateLendingTransaction} className="space-y-5 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                onClick={() =>
                  setNewLendingTransaction((prev) => ({
                    ...prev,
                    transaction_type: "lent",
                  }))
                }
                variant={
                  newLendingTransaction.transaction_type === "lent"
                    ? "primary"
                    : "secondary"
                }
                className="p-4 border-2 rounded-lg text-left transition-colors duration-200"
              >
                <div className="flex items-center mb-2">
                  <ArrowUpRight className="w-6 h-6 mr-3" />
                  <span className="font-semibold text-lg text-gray-800">
                    Money Lent
                  </span>
                </div>
                <p className="text-sm theme-text-secondary">
                  You gave money to someone
                </p>
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setNewLendingTransaction((prev) => ({
                    ...prev,
                    transaction_type: "borrowed",
                  }))
                }
                variant={
                  newLendingTransaction.transaction_type === "borrowed"
                    ? "primary"
                    : "secondary"
                }
                className="p-4 border-2 rounded-lg text-left transition-colors duration-200"
              >
                <div className="flex items-center mb-2">
                  <ArrowDownLeft className="w-6 h-6 mr-3" />
                  <span className="font-semibold text-lg text-gray-800">
                    Money Borrowed
                  </span>
                </div>
                <p className="text-sm theme-text-secondary">
                  You received money from someone
                </p>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Select
                label="Contact"
                value={newLendingTransaction.contact}
                onChange={(e) =>
                  setNewLendingTransaction((prev) => ({
                    ...prev,
                    contact: e.target.value,
                  }))
                }
                options={contacts.map((contact) => ({
                  value: contact.id,
                  label: contact.name,
                }))}
                required
              />
            </div>

            <div>
              <Select
                label="Account"
                value={newLendingTransaction.account}
                onChange={(e) =>
                  setNewLendingTransaction((prev) => ({
                    ...prev,
                    account: e.target.value,
                  }))
                }
                options={accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                }))}
                required
              />
            </div>
          </div>

          <Input
            label="Description"
            type="text"
            value={newLendingTransaction.description}
            onChange={(e) =>
              setNewLendingTransaction((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="e.g., Lunch money, Emergency loan, Trip expenses"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Input
                label="Amount"
                type="number"
                step="0.01"
                value={newLendingTransaction.amount}
                onChange={(e) =>
                  setNewLendingTransaction((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                placeholder="0.00"
                required
                icon={DollarSign}
              />
            </div>

            <div>
              <Input
                label="Date"
                type="date"
                value={newLendingTransaction.date}
                onChange={(e) =>
                  setNewLendingTransaction((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <div>
            <Input
              label="Notes"
              value={newLendingTransaction.notes}
              onChange={(e) =>
                setNewLendingTransaction((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              multiline
              rows={3}
              placeholder="Additional details about this transaction..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={() => setShowCreateLendingModal(false)}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Transaction
            </Button>
          </div>
        </form>
      </FormModal>

      {/* Record Repayment Modal */}
      <FormModal
        isOpen={showRepaymentModal}
        onClose={() => setShowRepaymentModal(false)}
        title="Record Repayment"
      >
        {selectedTransaction && (
          <form onSubmit={handleRecordRepayment} className="space-y-5 p-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-lg theme-text-primary">
                {selectedTransaction.contact_name || "Contact"}
              </h3>
              <p className="text-sm theme-text-secondary">
                {selectedTransaction.description}
              </p>
              <p className="text-sm theme-text-muted mt-1">
                Remaining:{" "}
                <span className="font-medium text-blue-600">
                  {formatCurrency(
                    selectedTransaction.remaining_amount || 0,
                    authState.user
                  )}
                </span>
              </p>
            </div>

            <div>
              <Input
                label="Repayment Amount"
                type="number"
                step="0.01"
                value={repaymentData.amount}
                onChange={(e) =>
                  setRepaymentData((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                max={selectedTransaction.remaining_amount || undefined}
                placeholder="0.00"
                required
                icon={DollarSign}
              />
            </div>

            <div>
              <Input
                label="Date"
                type="date"
                value={repaymentData.date}
                onChange={(e) =>
                  setRepaymentData((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div>
              <Input
                label="Notes"
                value={repaymentData.notes}
                onChange={(e) =>
                  setRepaymentData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                multiline
                rows={3}
                placeholder="Payment method, additional notes..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                onClick={() => setShowRepaymentModal(false)}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Record Payment
              </Button>
            </div>
          </form>
        )}
      </FormModal>
    </div>
  );
};