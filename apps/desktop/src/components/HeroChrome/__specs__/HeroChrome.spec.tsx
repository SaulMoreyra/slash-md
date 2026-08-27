import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import type { FrontmatterFields } from "../../../../shared/api";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../test/render";
import { HeroChrome, type HeroChromeProps } from "../HeroChrome";

const emptyFields: FrontmatterFields = {
  title: "",
  owner: "",
  status: "",
  updated: "",
  icon: "",
  cover: "",
  coverPosition: "",
  pr: "",
  reviewBranch: "",
  tags: "",
  people: "",
};

describe("HeroChrome", () => {
  const onPatch = vi.fn(async () => undefined);
  const onUploadCover = vi.fn(async () => "cover.png");

  const defaultProps: HeroChromeProps = {
    fields: emptyFields,
    imageMap: {},
    onPatch,
    onUploadCover,
    children: <div>Editor child</div>,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<HeroChromeProps> = {}) =>
    renderWithProviders(<HeroChrome {...defaultProps} {...props} />);

  it("renders add-icon and add-cover actions without hero fields", () => {
    renderComponent();
    expect(screen.getAllByRole("button", { name: t("hero.addIcon") })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: t("hero.addCover") })[0]).toBeInTheDocument();
    expect(screen.getByText("Editor child")).toBeInTheDocument();
  });

  it("opens the icon picker", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getAllByRole("button", { name: t("hero.addIcon") })[0]!);
    expect(screen.getByRole("dialog", { name: t("hero.chooseIcon") })).toBeInTheDocument();
  });

  it("shows cover change controls when a color cover is set", () => {
    renderComponent({
      fields: { ...emptyFields, cover: "color:#111111" },
    });
    expect(screen.getByRole("button", { name: t("hero.change") })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: t("hero.remove") })[0]).toBeInTheDocument();
  });

  it("hides cover edit controls on the wiki without a publication", () => {
    renderComponent({
      canWrite: false,
      fields: { ...emptyFields, cover: "color:#111111" },
    });
    expect(screen.queryByRole("button", { name: t("hero.change") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("hero.remove") })).not.toBeInTheDocument();
  });

  it("hides add-icon and add-cover on the wiki without a publication", () => {
    renderComponent({ canWrite: false });
    expect(screen.queryByRole("button", { name: t("hero.addIcon") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("hero.addCover") })).not.toBeInTheDocument();
  });
});
