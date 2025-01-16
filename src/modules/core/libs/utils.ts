export const isUndefined = (value: unknown): value is undefined =>
	value === undefined;

export const formatRupiah = (angka: number) => {
	// Pastikan input berupa angka
	if (typeof angka !== "number") {
		throw new Error("Input harus berupa angka");
	}
	return `Rp ${angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};
