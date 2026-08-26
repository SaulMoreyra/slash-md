import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/render";
import { Modal, type ModalProps } from "../Modal";

describe("Modal", () => {
  const onClose = vi.fn();
  const defaultProps: ModalProps = {
    title: "Test modal",
    onClose,
    children: <p>Modal body</p>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<ModalProps> = {}) =>
    renderWithProviders(<Modal {...defaultProps} {...props} />);

  it("renders title and children", () => {
    renderComponent();
    expect(screen.getByText("Test modal")).toBeInTheDocument();
    expect(screen.getByText("Modal body")).toBeInTheDocument();
  });

  it("calls onClose when dismissible backdrop closes", async () => {
    const user = userEvent.setup();
    renderComponent();
    const close = screen.getByRole("button", { name: /close/i });
    await user.click(close);
    expect(onClose).toHaveBeenCalled();
  });
});
