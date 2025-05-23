
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantStyles = {
    primary: "bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-100 focus:ring-slate-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    outline: "border border-slate-600 hover:bg-slate-800 text-slate-300 focus:ring-sky-500",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
};


interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  helperText?: string;
}

export const TextInput: React.FC<TextInputProps> = ({ label, id, helperText, className, ...props }) => {
  return (
    <div className="w-full"> {/* Removed mb-3 from here */}
      {label && <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
      <input
        id={id}
        type="text"
        className={`w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500 placeholder-slate-500 ${className || ''}`}
        {...props}
      />
      {helperText && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
    </div>
  );
};


interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  id: string;
  helperText?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, id, helperText, className, ...props }) => {
  return (
    <div className="mb-3 w-full"> {/* TextArea retains its mb-3 for general block spacing */}
      {label && <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
      <textarea
        id={id}
        className={`w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500 placeholder-slate-500 resize-y ${className || ''}`}
        {...props}
      />
      {helperText && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  id: string;
  options: { value: string; label: string }[];
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({ label, id, options, helperText, className, ...props }) => {
  return (
    <div className="mb-3 w-full"> {/* Select retains its mb-3 for general block spacing */}
      {label && <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
      <select
        id={id}
        className={`w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500 ${className || ''}`}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {helperText && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
    </div>
  );
};
