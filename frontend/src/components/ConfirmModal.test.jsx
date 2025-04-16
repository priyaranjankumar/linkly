import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from './ConfirmModal';

describe('ConfirmModal', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ConfirmModal isOpen={false} onClose={() => {}} onConfirm={() => {}} title="Title" message="Message" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders with title and message when open', () => {
    render(
      <ConfirmModal isOpen={true} onClose={() => {}} onConfirm={() => {}} title="Delete?" message="Are you sure?" />
    );
    expect(screen.getByText(/delete\?/i)).toBeInTheDocument();
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(
      <ConfirmModal isOpen={true} onClose={onClose} onConfirm={() => {}} title="Title" message="Message" />
    );
    fireEvent.click(screen.getByText(/cancel/i));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onConfirm when Confirm Delete is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal isOpen={true} onClose={() => {}} onConfirm={onConfirm} title="Title" message="Message" />
    );
    fireEvent.click(screen.getByText(/confirm delete/i));
    expect(onConfirm).toHaveBeenCalled();
  });
});
