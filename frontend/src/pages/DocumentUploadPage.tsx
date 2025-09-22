import React, { useState } from 'react';

const DocumentUploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      // In a real application, you would send this file to a backend server.
      // For now, we'll just simulate an upload by adding the file name to the list.
      setUploadedDocuments([...uploadedDocuments, selectedFile.name]);
      setSelectedFile(null); // Clear the selected file after "upload"
      alert(`File ${selectedFile.name} uploaded successfully! (Simulated)`);
    } else {
      alert('Please select a file to upload.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Document Upload and Viewing</h1>

      <div className="mb-6 p-4 border rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-3">Upload New Document</h2>
        <input
          type="file"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        <button
          onClick={handleUpload}
          disabled={!selectedFile}
          className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Upload Document
        </button>
      </div>

      <div className="p-4 border rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-3">Uploaded Documents</h2>
        {uploadedDocuments.length === 0 ? (
          <p className="text-gray-600">No documents uploaded yet.</p>
        ) : (
          <ul className="list-disc pl-5">
            {uploadedDocuments.map((doc, index) => (
              <li key={index} className="text-gray-800 mb-1">{doc}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DocumentUploadPage;
