const Commands = [
	{
		name: "done",
		description: "Mengupdate status project menjadi done",
	},
	{
		name: "projects",
		description: "Melihat daftar project tim (max 10)",
		options: [
			{
				name: "status",
				description: "Filter project berdasarkan status",
				type: 3, // STRING type
				required: false,
				choices: [
					{ name: "DRAFT", value: "DRAFT" },
					{ name: "OFFERING", value: "OFFERING" },
					{ name: "IN_PROGRESS", value: "IN_PROGRESS" },
					{ name: "REVISION", value: "REVISION" },
					{ name: "DONE", value: "DONE" },
					{ name: "CANCELLED", value: "CANCELLED" },
				],
			},
			{
				name: "team",
				description: "Discord User ID (Admin only)",
				type: 3, // STRING type
				required: false,
			},
		],
	},
	{
		name: "image-production-per-week",
		description: "Melihat statistik produksi gambar per minggu",
		options: [
			{
				name: "bulan",
				description: "Bulan (1-12)",
				type: 4, // INTEGER type
				required: false,
				min_value: 1,
				max_value: 12,
			},
			{
				name: "tahun",
				description: "Tahun",
				type: 4, // INTEGER type
				required: false,
				min_value: 2020,
				max_value: 2030,
			},
		],
	},
	{
		name: "ask-ai",
		description: "Tanyakan pertanyaan ke AI assistant",
		options: [
			{
				name: "question",
				description: "Pertanyaan yang ingin kamu tanyakan",
				type: 3, // STRING type
				required: true,
			},
		],
	},
];

export { Commands };
